// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import 'package:url_launcher/url_launcher.dart';
// import '../../config/api_config.dart';
// import '../../models/product_model.dart';
// import '../../services/services.dart';
// import '../../services/auth_service.dart';
// import '../../widgets/delivery_check_widget.dart';

// class ProductDetailScreen extends StatefulWidget {
//   final Product product;
//   const ProductDetailScreen({super.key, required this.product});

//   @override
//   State<ProductDetailScreen> createState() => _ProductDetailScreenState();
// }

// class _ProductDetailScreenState extends State<ProductDetailScreen> {
//   bool addingToCart     = false;
//   bool isWishlisted     = false;
//   bool wishlistInFlight = false;
//   int  selectedImage    = 0;

//   // ── Quantity selector ──────────────────────────────────────────────────────
//   int _qty = 1;

//   List<Map<String, dynamic>> reviews = [];
//   bool   loadingReviews  = true;
//   double avgRating       = 0;

//   int    selectedRating   = 5;
//   final  commentCtrl      = TextEditingController();
//   bool   submittingReview = false;

//   bool _notifySubscribed = false;
//   bool _notifyLoading    = true;
//   bool _notifyInFlight   = false;

//   bool _canReview   = false;
//   bool _hasReviewed = false;
//   int  _reviewOrderId = 0;

//   @override
//   void initState() {
//     super.initState();
//     _checkWishlist();
//     _loadReviews();
//     if (widget.product.stock <= 0) _checkNotifyStatus();
//     _checkCanReview();
//   }

//   @override
//   void dispose() {
//     commentCtrl.dispose();
//     super.dispose();
//   }

//   Future<void> _checkWishlist() async {
//     if (AuthService.currentUser == null) return;
//     final ids = await WishlistService.getWishlistIds();
//     if (mounted) setState(() => isWishlisted = ids.contains(widget.product.id));
//   }

//   Future<void> _loadReviews() async {
//     setState(() => loadingReviews = true);
//     final res = await ReviewService.getProductReviews(widget.product.id);
//     if (!mounted) return;
//     final list = List<Map<String, dynamic>>.from(res['reviews'] ?? []);
//     final avg = list.isEmpty
//         ? 0.0
//         : list.map((r) => (r['rating'] as num).toDouble()).reduce((a, b) => a + b) /
//             list.length;
//     final uid    = AuthService.currentUser?.id;
//     final myName = AuthService.currentUser?.name ?? '';
//     setState(() {
//       reviews        = list;
//       avgRating      = double.parse(avg.toStringAsFixed(1));
//       loadingReviews = false;
//       _hasReviewed   = uid != null &&
//           list.any((r) =>
//               (r['customerId'] != null && r['customerId'] == uid) ||
//               (r['customerName'] ?? '') == myName);
//     });
//   }

//   Future<void> _checkCanReview() async {
//     if (AuthService.currentUser?.role != 'CUSTOMER') return;
//     try {
//       final orders = await OrderService.getOrders();
//       for (final order in orders) {
//         if (order.trackingStatus == 'DELIVERED') {
//           if (order.items.any((item) => item.productId == widget.product.id)) {
//             if (mounted) {
//               setState(() { _canReview = true; _reviewOrderId = order.id; });
//             }
//             return;
//           }
//         }
//       }
//     } catch (_) {}
//   }

//   Future<void> _checkNotifyStatus() async {
//     final sub = await NotifyMeService.isSubscribed(widget.product.id);
//     if (mounted) setState(() { _notifySubscribed = sub; _notifyLoading = false; });
//   }

//   Future<void> _toggleNotifyMe() async {
//     if (_notifyInFlight) return;
//     final wasSubscribed = _notifySubscribed;
//     setState(() => _notifyInFlight = true);
//     final res = wasSubscribed
//         ? await NotifyMeService.unsubscribe(widget.product.id)
//         : await NotifyMeService.subscribe(widget.product.id);
//     if (!mounted) return;
//     setState(() {
//       _notifyInFlight = false;
//       if (res['success'] == true) _notifySubscribed = !wasSubscribed;
//     });
//     ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//       content: Text(res['message'] ??
//           (!wasSubscribed ? 'You will be notified!' : 'Notification removed')),
//       backgroundColor: res['success'] == true ? Colors.green : Colors.red,
//       behavior: SnackBarBehavior.floating,
//     ));
//   }

//   Future<void> _addToCart() async {
//     setState(() => addingToCart = true);
//     final res = await CartService.addToCart(widget.product.id, _qty);
//     setState(() => addingToCart = false);
//     if (!mounted) return;
//     ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//       content: Text(res['success'] == true
//           ? _qty == 1 ? 'Added to cart!' : '$_qty items added to cart!'
//           : res['message'] ?? 'Failed'),
//       backgroundColor: res['success'] == true ? Colors.green : Colors.red,
//       behavior: SnackBarBehavior.floating,
//     ));
//   }

//   Future<void> _toggleWishlist() async {
//     if (AuthService.currentUser == null) {
//       ScaffoldMessenger.of(context).showSnackBar(
//           const SnackBar(content: Text('Please login to use wishlist')));
//       return;
//     }
//     if (wishlistInFlight) return;
//     final was = isWishlisted;
//     setState(() { isWishlisted = !isWishlisted; wishlistInFlight = true; });
//     final res = await WishlistService.toggle(widget.product.id);
//     if (!mounted) return;
//     if (res['success'] != true) {
//       setState(() => isWishlisted = was);
//       ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//           content: Text(res['message'] ?? 'Wishlist update failed'),
//           backgroundColor: Colors.red));
//     }
//     setState(() => wishlistInFlight = false);
//   }

//   String _buildShareText() {
//     final p       = widget.product;
//     final webLink = ApiConfig.productWebUrl(p.id);
//     final desc    = p.description.isNotEmpty
//         ? p.description.substring(
//             0, p.description.length > 120 ? 120 : p.description.length)
//         : '';
//     return '🛍️ ${p.name}'
//         '${p.isDiscounted ? '  •  ${p.discountPercent}% OFF' : ''}\n'
//         '₹${p.price.toStringAsFixed(2)}'
//         '${p.isDiscounted ? ' (was ₹${p.mrp.toStringAsFixed(0)})' : ''}\n'
//         '${desc.isNotEmpty ? '$desc...\n' : ''}'
//         '\nShop on Ekart 👉 $webLink';
//   }

//   Future<void> _launchUrl(String url) async {
//     final uri = Uri.parse(url);
//     try {
//       // ignore: deprecated_member_use
//       final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
//       if (!launched) throw Exception('Could not launch');
//     } catch (_) {
//       await Clipboard.setData(ClipboardData(text: _buildShareText()));
//       if (mounted) {
//         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
//           content: Text('Link copied — open your app and paste to share'),
//           behavior: SnackBarBehavior.floating,
//         ));
//       }
//     }
//   }

//   void _shareProduct() {
//     final shareText   = _buildShareText();
//     final encodedText = Uri.encodeComponent(shareText);
//     final webLink     = ApiConfig.productWebUrl(widget.product.id);
//     final encodedLink = Uri.encodeComponent(webLink);

//     showModalBottomSheet(
//       context: context,
//       shape: const RoundedRectangleBorder(
//           borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
//       builder: (_) => Padding(
//         padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
//         child: Column(mainAxisSize: MainAxisSize.min, children: [
//           Container(width: 40, height: 4,
//               margin: const EdgeInsets.only(bottom: 16),
//               decoration: BoxDecoration(
//                   color: Colors.grey.shade300,
//                   borderRadius: BorderRadius.circular(2))),
//           const Text('Share Product',
//               style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
//           const SizedBox(height: 4),
//           Text(widget.product.name,
//               maxLines: 1, overflow: TextOverflow.ellipsis,
//               style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
//           const SizedBox(height: 20),
//           Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
//             _shareIcon(icon: Icons.message_rounded, color: const Color(0xFF25D366),
//                 label: 'WhatsApp', onTap: () { Navigator.pop(context);
//                   _launchUrl('https://wa.me/?text=$encodedText'); }),
//             _shareIcon(icon: Icons.send_rounded, color: const Color(0xFF0088CC),
//                 label: 'Telegram', onTap: () { Navigator.pop(context);
//                   _launchUrl('https://t.me/share/url?url=$encodedLink&text=$encodedText'); }),
//             _shareIcon(icon: Icons.camera_alt_rounded, color: const Color(0xFFE1306C),
//                 label: 'Instagram', onTap: () {
//                   Navigator.pop(context);
//                   Clipboard.setData(ClipboardData(text: shareText)).then((_) {
//                     _launchUrl('instagram://app');
//                     if (mounted) ScaffoldMessenger.of(context).showSnackBar(
//                         const SnackBar(
//                             content: Text('Link copied — paste in Instagram DM'),
//                             behavior: SnackBarBehavior.floating,
//                             duration: Duration(seconds: 3)));
//                   });
//                 }),
//             _shareIcon(icon: Icons.email_rounded, color: const Color(0xFFEA4335),
//                 label: 'Gmail', onTap: () {
//                   Navigator.pop(context);
//                   final subject = Uri.encodeComponent(
//                       'Check out ${widget.product.name} on Ekart!');
//                   _launchUrl('mailto:?subject=$subject&body=$encodedText');
//                 }),
//           ]),
//           const SizedBox(height: 20),
//           Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
//             _shareIcon(icon: Icons.sms_rounded, color: const Color(0xFF34A853),
//                 label: 'SMS', onTap: () { Navigator.pop(context);
//                   _launchUrl('sms:?body=$encodedText'); }),
//             _shareIcon(icon: Icons.facebook_rounded, color: const Color(0xFF1877F2),
//                 label: 'Facebook', onTap: () { Navigator.pop(context);
//                   _launchUrl('https://www.facebook.com/sharer/sharer.php?u=$encodedLink'); }),
//             _shareIcon(icon: Icons.chat_bubble_rounded, color: const Color(0xFF128C7E),
//                 label: 'WA Business', onTap: () { Navigator.pop(context);
//                   _launchUrl('https://wa.me/?text=$encodedText'); }),
//             _shareIcon(icon: Icons.link_rounded, color: Colors.blue.shade700,
//                 label: 'Copy Link', onTap: () {
//                   Navigator.pop(context);
//                   Clipboard.setData(ClipboardData(text: shareText));
//                   ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//                     content: const Row(children: [
//                       Icon(Icons.check_circle, color: Colors.white, size: 18),
//                       SizedBox(width: 8),
//                       Text('Product link copied!'),
//                     ]),
//                     backgroundColor: Colors.green.shade700,
//                     behavior: SnackBarBehavior.floating,
//                     duration: const Duration(seconds: 2),
//                   ));
//                 }),
//           ]),
//           const SizedBox(height: 20),
//           Container(
//             padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
//             decoration: BoxDecoration(
//                 color: Colors.grey.shade50,
//                 borderRadius: BorderRadius.circular(10),
//                 border: Border.all(color: Colors.grey.shade200)),
//             child: Row(children: [
//               Icon(Icons.link, size: 16, color: Colors.blue.shade700),
//               const SizedBox(width: 8),
//               Expanded(
//                 child: Text(ApiConfig.productWebUrl(widget.product.id),
//                     style: TextStyle(
//                         color: Colors.blue.shade700, fontSize: 12,
//                         decoration: TextDecoration.underline),
//                     maxLines: 1, overflow: TextOverflow.ellipsis),
//               ),
//               GestureDetector(
//                 onTap: () {
//                   Clipboard.setData(ClipboardData(
//                       text: ApiConfig.productWebUrl(widget.product.id)));
//                   Navigator.pop(context);
//                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
//                       content: Text('Link copied!'),
//                       behavior: SnackBarBehavior.floating,
//                       duration: Duration(seconds: 2)));
//                 },
//                 child: Padding(
//                   padding: const EdgeInsets.only(left: 8),
//                   child: Icon(Icons.copy, size: 16, color: Colors.grey.shade500),
//                 ),
//               ),
//             ]),
//           ),
//         ]),
//       ),
//     );
//   }

//   Widget _shareIcon({
//     required IconData icon,
//     required Color color,
//     required String label,
//     required VoidCallback onTap,
//   }) {
//     return GestureDetector(
//       onTap: onTap,
//       child: Column(mainAxisSize: MainAxisSize.min, children: [
//         Container(
//           width: 54, height: 54,
//           decoration: BoxDecoration(color: color, shape: BoxShape.circle,
//               boxShadow: [BoxShadow(color: color.withValues(alpha: 0.30),
//                   blurRadius: 8, offset: const Offset(0, 3))]),
//           child: Icon(icon, color: Colors.white, size: 26),
//         ),
//         const SizedBox(height: 6),
//         Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
//       ]),
//     );
//   }

//   Future<void> _submitReview() async {
//     if (commentCtrl.text.trim().isEmpty) {
//       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
//           content: Text('Please write a comment'),
//           backgroundColor: Colors.red));
//       return;
//     }
//     setState(() => submittingReview = true);
//     final res = await ReviewService.addReview(
//       productId: widget.product.id,
//       orderId:   _reviewOrderId,
//       rating:    selectedRating,
//       comment:   commentCtrl.text.trim(),
//     );
//     setState(() => submittingReview = false);
//     if (!mounted) return;
//     ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//       content: Text(res['message'] ??
//           (res['success'] == true ? 'Review submitted!' : 'Failed')),
//       backgroundColor: res['success'] == true ? Colors.green : Colors.red,
//     ));
//     if (res['success'] == true) {
//       commentCtrl.clear();
//       setState(() { selectedRating = 5; _hasReviewed = true; });
//       Navigator.pop(context);
//       _loadReviews();
//     }
//   }

//   void _showReviewDialog() {
//     showModalBottomSheet(
//       context: context,
//       isScrollControlled: true,
//       shape: const RoundedRectangleBorder(
//           borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
//       builder: (_) => StatefulBuilder(
//         builder: (ctx, setS) => Padding(
//           padding: EdgeInsets.only(
//               left: 20, right: 20, top: 20,
//               bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
//           child: Column(mainAxisSize: MainAxisSize.min,
//               crossAxisAlignment: CrossAxisAlignment.start, children: [
//             Row(children: [
//               const Text('Write a Review',
//                   style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
//               const Spacer(),
//               IconButton(icon: const Icon(Icons.close),
//                   onPressed: () => Navigator.pop(context)),
//             ]),
//             const SizedBox(height: 4),
//             Text(widget.product.name,
//                 style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
//             const SizedBox(height: 16),
//             const Text('Your Rating', style: TextStyle(fontWeight: FontWeight.w600)),
//             const SizedBox(height: 8),
//             Row(children: List.generate(5, (i) => GestureDetector(
//               onTap: () {
//                 setS(() => selectedRating = i + 1);
//                 setState(() => selectedRating = i + 1);
//               },
//               child: Padding(
//                 padding: const EdgeInsets.only(right: 4),
//                 child: Icon(
//                     i < selectedRating ? Icons.star : Icons.star_border,
//                     color: Colors.amber, size: 38),
//               ),
//             ))),
//             const SizedBox(height: 16),
//             TextField(
//               controller: commentCtrl,
//               maxLines: 4,
//               decoration: const InputDecoration(
//                 hintText: 'Share your experience with this product...',
//                 border: OutlineInputBorder(),
//                 counterText: '',
//               ),
//               maxLength: 500,
//             ),
//             const SizedBox(height: 16),
//             SizedBox(
//               width: double.infinity,
//               child: ElevatedButton(
//                 onPressed: submittingReview ? null : _submitReview,
//                 style: ElevatedButton.styleFrom(
//                     backgroundColor: Colors.blue.shade700,
//                     padding: const EdgeInsets.symmetric(vertical: 14)),
//                 child: submittingReview
//                     ? const SizedBox(height: 20, width: 20,
//                         child: CircularProgressIndicator(
//                             color: Colors.white, strokeWidth: 2))
//                     : const Text('Submit Review',
//                         style: TextStyle(color: Colors.white, fontSize: 15)),
//               ),
//             ),
//           ]),
//         ),
//       ),
//     );
//   }

//   @override
//   Widget build(BuildContext context) {
//     final p            = widget.product;
//     final images       = [if (p.imageLink.isNotEmpty) p.imageLink, ...p.extraImages];
//     final isOutOfStock = p.stock <= 0;
//     final maxQty       = isOutOfStock ? 0 : p.stock.clamp(1, 10);

//     return Scaffold(
//       appBar: AppBar(
//         title: Text(p.name, overflow: TextOverflow.ellipsis),
//         backgroundColor: Colors.blue.shade700,
//         foregroundColor: Colors.white,
//         actions: [
//           IconButton(
//               icon: const Icon(Icons.share),
//               tooltip: 'Share Product',
//               onPressed: _shareProduct),
//           IconButton(
//             icon: wishlistInFlight
//                 ? const SizedBox(width: 20, height: 20,
//                     child: CircularProgressIndicator(
//                         color: Colors.white, strokeWidth: 2.5))
//                 : Icon(isWishlisted ? Icons.favorite : Icons.favorite_border,
//                     color: isWishlisted ? Colors.red.shade300 : Colors.white),
//             onPressed: wishlistInFlight ? null : _toggleWishlist,
//           ),
//         ],
//       ),
//       body: SingleChildScrollView(
//         child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

//           // ── Main image ───────────────────────────────────────────────────
//           Stack(children: [
//             images.isNotEmpty
//                 ? Image.network(images[selectedImage],
//                     height: 280, width: double.infinity, fit: BoxFit.cover,
//                     errorBuilder: (_, __, ___) => Container(
//                         height: 280, color: Colors.grey[200],
//                         child: const Icon(Icons.image_not_supported, size: 80)))
//                 : Container(height: 280, color: Colors.grey[200],
//                     child: const Icon(Icons.image, size: 80)),
//             if (p.isDiscounted)
//               Positioned(top: 12, left: 12,
//                 child: Container(
//                   padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
//                   decoration: BoxDecoration(
//                       color: Colors.red, borderRadius: BorderRadius.circular(20)),
//                   child: Text('${p.discountPercent}% OFF',
//                       style: const TextStyle(color: Colors.white,
//                           fontWeight: FontWeight.bold, fontSize: 12)),
//                 )),
//             if (isOutOfStock)
//               Positioned(top: 12, right: 12,
//                 child: Container(
//                   padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
//                   decoration: BoxDecoration(
//                       color: Colors.red.shade700,
//                       borderRadius: BorderRadius.circular(20)),
//                   child: const Text('Out of Stock',
//                       style: TextStyle(color: Colors.white,
//                           fontWeight: FontWeight.bold, fontSize: 12)),
//                 )),
//           ]),

//           // ── Thumbnail strip ──────────────────────────────────────────────
//           if (images.length > 1)
//             SizedBox(
//               height: 80,
//               child: ListView.builder(
//                 scrollDirection: Axis.horizontal,
//                 padding: const EdgeInsets.all(8),
//                 itemCount: images.length,
//                 itemBuilder: (_, i) => GestureDetector(
//                   onTap: () => setState(() => selectedImage = i),
//                   child: Container(
//                     width: 64, height: 64,
//                     margin: const EdgeInsets.only(right: 8),
//                     decoration: BoxDecoration(
//                       border: Border.all(
//                           color: selectedImage == i
//                               ? Colors.blue.shade700 : Colors.grey[300]!,
//                           width: 2),
//                       borderRadius: BorderRadius.circular(8),
//                     ),
//                     child: ClipRRect(
//                       borderRadius: BorderRadius.circular(6),
//                       child: Image.network(images[i], fit: BoxFit.cover),
//                     ),
//                   ),
//                 ),
//               ),
//             ),

//           Padding(
//             padding: const EdgeInsets.all(16),
//             child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

//               // ── Price & Stock ──────────────────────────────────────────
//               Row(children: [
//                 Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//                   Text('₹${p.price.toStringAsFixed(2)}',
//                       style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold,
//                           color: Colors.blue.shade700)),
//                   if (p.isDiscounted)
//                     Text('MRP ₹${p.mrp.toStringAsFixed(2)}',
//                         style: const TextStyle(fontSize: 14,
//                             decoration: TextDecoration.lineThrough,
//                             color: Colors.grey)),
//                 ]),
//                 const Spacer(),
//                 Container(
//                   padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
//                   decoration: BoxDecoration(
//                     color: p.stock > 0 ? Colors.green.shade50 : Colors.red.shade50,
//                     borderRadius: BorderRadius.circular(20),
//                     border: Border.all(
//                         color: p.stock > 0 ? Colors.green : Colors.red),
//                   ),
//                   child: Text(
//                     p.stock > 0 ? '${p.stock} In Stock' : 'Out of Stock',
//                     style: TextStyle(
//                         color: p.stock > 0
//                             ? Colors.green.shade700 : Colors.red,
//                         fontWeight: FontWeight.w600),
//                   ),
//                 ),
//               ]),
//               const SizedBox(height: 10),
//               Text(p.name,
//                   style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
//               const SizedBox(height: 4),
//               Row(children: [
//                 Icon(Icons.category, size: 16, color: Colors.grey[500]),
//                 const SizedBox(width: 4),
//                 Text(p.category, style: TextStyle(color: Colors.grey[600])),
//               ]),
//               if (p.vendorCode != null) ...[
//                 const SizedBox(height: 4),
//                 Row(children: [
//                   Icon(Icons.store, size: 16, color: Colors.grey[500]),
//                   const SizedBox(width: 4),
//                   Text('Sold by: ${p.vendorCode}',
//                       style: TextStyle(color: Colors.grey[600])),
//                 ]),
//               ],
//               if (!loadingReviews && reviews.isNotEmpty) ...[
//                 const SizedBox(height: 8),
//                 Row(children: [
//                   const Icon(Icons.star, color: Colors.amber, size: 18),
//                   const SizedBox(width: 4),
//                   Text('$avgRating',
//                       style: const TextStyle(fontWeight: FontWeight.bold)),
//                   Text(' (${reviews.length} reviews)',
//                       style: TextStyle(color: Colors.grey[600], fontSize: 13)),
//                 ]),
//               ],

//               // ── Return & Refund Policy badge (NEW) ─────────────────────
//               const SizedBox(height: 12),
//               _buildReturnPolicyBadge(p),

//               // ── Share row ──────────────────────────────────────────────
//               const SizedBox(height: 12),
//               Row(children: [
//                 OutlinedButton.icon(
//                   onPressed: _shareProduct,
//                   icon: const Icon(Icons.share, size: 16),
//                   label: const Text('Share Product'),
//                   style: OutlinedButton.styleFrom(
//                     foregroundColor: Colors.blue.shade700,
//                     side: BorderSide(color: Colors.blue.shade300),
//                     shape: RoundedRectangleBorder(
//                         borderRadius: BorderRadius.circular(20)),
//                   ),
//                 ),
//               ]),

//               const Divider(height: 28),

//               // ── Quantity selector (NEW) ────────────────────────────────
//               if (!isOutOfStock) ...[
//                 _buildQuantitySelector(p, maxQty),
//                 const SizedBox(height: 16),
//               ],

//               const Text('Description',
//                   style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
//               const SizedBox(height: 8),
//               Text(
//                 p.description.isNotEmpty
//                     ? p.description : 'No description available.',
//                 style: TextStyle(color: Colors.grey[700], height: 1.5),
//               ),

//               // ── Notify Me (out of stock only) ──────────────────────────
//               if (isOutOfStock) ...[
//                 const SizedBox(height: 20),
//                 const Divider(),
//                 const SizedBox(height: 8),
//                 Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
//                   Icon(Icons.notifications_outlined,
//                       color: Colors.orange.shade700, size: 22),
//                   const SizedBox(width: 10),
//                   Expanded(child: Column(
//                       crossAxisAlignment: CrossAxisAlignment.start, children: [
//                     const Text('Currently Unavailable',
//                         style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
//                     const SizedBox(height: 2),
//                     Text('Get notified as soon as this item is back in stock.',
//                         style: TextStyle(color: Colors.grey[600], fontSize: 13)),
//                     const SizedBox(height: 10),
//                     if (_notifyLoading)
//                       const SizedBox(height: 20, width: 20,
//                           child: CircularProgressIndicator(strokeWidth: 2))
//                     else
//                       ElevatedButton.icon(
//                         onPressed: _notifyInFlight ? null : _toggleNotifyMe,
//                         icon: _notifyInFlight
//                             ? const SizedBox(width: 16, height: 16,
//                                 child: CircularProgressIndicator(
//                                     strokeWidth: 2, color: Colors.white))
//                             : Icon(_notifySubscribed
//                                 ? Icons.notifications_active
//                                 : Icons.notifications_none, size: 18),
//                         label: Text(_notifySubscribed
//                             ? 'You\'re notified ✓'
//                             : 'Notify Me When Available'),
//                         style: ElevatedButton.styleFrom(
//                           backgroundColor: _notifySubscribed
//                               ? Colors.green.shade600 : Colors.orange.shade700,
//                           foregroundColor: Colors.white,
//                           shape: RoundedRectangleBorder(
//                               borderRadius: BorderRadius.circular(10)),
//                         ),
//                       ),
//                   ])),
//                 ]),
//               ],

//               // ── Delivery PIN Checker ───────────────────────────────────
//               const SizedBox(height: 20),
//               DeliveryCheckWidget(allowedPinCodes: widget.product.allowedPinCodes),

//               const SizedBox(height: 24),

//               // ── Reviews ───────────────────────────────────────────────
//               _buildReviewsSection(),

//               const SizedBox(height: 32),
//             ]),
//           ),
//         ]),
//       ),

//       // ── Bottom bar: Qty selector + Add to Cart ─────────────────────────
//       bottomNavigationBar: _buildBottomBar(p, isOutOfStock, maxQty),
//     );
//   }

//   // ── Return Policy Badge ────────────────────────────────────────────────────

//   Widget _buildReturnPolicyBadge(Product p) {
//     if (p.returnsAccepted) {
//       return Container(
//         padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//         decoration: BoxDecoration(
//           color: Colors.green.shade50,
//           borderRadius: BorderRadius.circular(8),
//           border: Border.all(color: Colors.green.shade200),
//         ),
//         child: Row(children: [
//           Icon(Icons.assignment_return, size: 16, color: Colors.green.shade700),
//           const SizedBox(width: 8),
//           Expanded(child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start, children: [
//             Text('7-Day Returns & Refunds',
//                 style: TextStyle(
//                     fontWeight: FontWeight.w600,
//                     color: Colors.green.shade800,
//                     fontSize: 13)),
//             Text(
//               'The vendor accepts returns and refunds within 7 days of delivery.',
//               style: TextStyle(fontSize: 11, color: Colors.green.shade700),
//             ),
//           ])),
//         ]),
//       );
//     } else {
//       return Container(
//         padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//         decoration: BoxDecoration(
//           color: Colors.red.shade50,
//           borderRadius: BorderRadius.circular(8),
//           border: Border.all(color: Colors.red.shade200),
//         ),
//         child: Row(children: [
//           Icon(Icons.block, size: 16, color: Colors.red.shade700),
//           const SizedBox(width: 8),
//           Expanded(child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start, children: [
//             Text('No Returns or Refunds',
//                 style: TextStyle(
//                     fontWeight: FontWeight.w600,
//                     color: Colors.red.shade800,
//                     fontSize: 13)),
//             Text(
//               'The vendor does not offer returns or refunds for this product.',
//               style: TextStyle(fontSize: 11, color: Colors.red.shade700),
//             ),
//           ])),
//         ]),
//       );
//     }
//   }

//   // ── Quantity Selector ──────────────────────────────────────────────────────

//   Widget _buildQuantitySelector(Product p, int maxQty) {
//     return Row(children: [
//       const Text('Quantity',
//           style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
//       const SizedBox(width: 16),
//       Container(
//         decoration: BoxDecoration(
//           border: Border.all(color: Colors.grey.shade300),
//           borderRadius: BorderRadius.circular(8),
//         ),
//         child: Row(mainAxisSize: MainAxisSize.min, children: [
//           // Decrement
//           InkWell(
//             onTap: _qty > 1 ? () => setState(() => _qty--) : null,
//             borderRadius: const BorderRadius.horizontal(left: Radius.circular(7)),
//             child: Padding(
//               padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//               child: Icon(Icons.remove,
//                   size: 18,
//                   color: _qty > 1 ? Colors.grey.shade700 : Colors.grey.shade300),
//             ),
//           ),
//           // Value
//           Container(
//             padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//             decoration: BoxDecoration(
//               border: Border.symmetric(
//                   vertical: BorderSide(color: Colors.grey.shade300)),
//             ),
//             child: Text('$_qty',
//                 style: const TextStyle(
//                     fontSize: 16, fontWeight: FontWeight.bold)),
//           ),
//           // Increment
//           InkWell(
//             onTap: _qty < maxQty ? () => setState(() => _qty++) : null,
//             borderRadius: const BorderRadius.horizontal(right: Radius.circular(7)),
//             child: Padding(
//               padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//               child: Icon(Icons.add,
//                   size: 18,
//                   color: _qty < maxQty
//                       ? Colors.grey.shade700 : Colors.grey.shade300),
//             ),
//           ),
//         ]),
//       ),
//       const SizedBox(width: 12),
//       // Max stock indicator
//       if (p.stock <= 5)
//         Text('Only ${p.stock} left!',
//             style: TextStyle(
//                 color: Colors.orange.shade700,
//                 fontSize: 12,
//                 fontWeight: FontWeight.w500)),
//     ]);
//   }

//   // ── Bottom Bar ─────────────────────────────────────────────────────────────

//   Widget _buildBottomBar(Product p, bool isOutOfStock, int maxQty) {
//     if (isOutOfStock) {
//       return Padding(
//         padding: const EdgeInsets.all(16),
//         child: SizedBox(
//           height: 52,
//           child: OutlinedButton.icon(
//             onPressed: null,
//             icon: const Icon(Icons.remove_shopping_cart),
//             label: const Text('Out of Stock',
//                 style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
//             style: OutlinedButton.styleFrom(
//                 foregroundColor: Colors.red,
//                 side: const BorderSide(color: Colors.red),
//                 shape: RoundedRectangleBorder(
//                     borderRadius: BorderRadius.circular(10))),
//           ),
//         ),
//       );
//     }

//     return Container(
//       padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
//       decoration: BoxDecoration(
//         color: Colors.white,
//         boxShadow: [
//           BoxShadow(color: Colors.grey.withValues(alpha: 0.15),
//               blurRadius: 10, offset: const Offset(0, -3)),
//         ],
//       ),
//       child: Row(children: [
//         // Compact qty selector in bottom bar
//         Container(
//           decoration: BoxDecoration(
//             border: Border.all(color: Colors.grey.shade300),
//             borderRadius: BorderRadius.circular(8),
//           ),
//           child: Row(mainAxisSize: MainAxisSize.min, children: [
//             InkWell(
//               onTap: _qty > 1 ? () => setState(() => _qty--) : null,
//               borderRadius: const BorderRadius.horizontal(left: Radius.circular(7)),
//               child: Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
//                 child: Icon(Icons.remove, size: 16,
//                     color: _qty > 1 ? Colors.grey.shade700 : Colors.grey.shade300),
//               ),
//             ),
//             Container(
//               padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
//               decoration: BoxDecoration(
//                 border: Border.symmetric(
//                     vertical: BorderSide(color: Colors.grey.shade300)),
//               ),
//               child: Text('$_qty',
//                   style: const TextStyle(
//                       fontSize: 15, fontWeight: FontWeight.bold)),
//             ),
//             InkWell(
//               onTap: _qty < maxQty ? () => setState(() => _qty++) : null,
//               borderRadius: const BorderRadius.horizontal(right: Radius.circular(7)),
//               child: Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
//                 child: Icon(Icons.add, size: 16,
//                     color: _qty < maxQty
//                         ? Colors.grey.shade700 : Colors.grey.shade300),
//               ),
//             ),
//           ]),
//         ),
//         const SizedBox(width: 12),
//         // Add to Cart
//         Expanded(
//           child: SizedBox(
//             height: 52,
//             child: ElevatedButton.icon(
//               onPressed: addingToCart ? null : _addToCart,
//               icon: addingToCart
//                   ? const SizedBox(width: 20, height: 20,
//                       child: CircularProgressIndicator(
//                           color: Colors.white, strokeWidth: 2))
//                   : const Icon(Icons.add_shopping_cart),
//               label: Text(
//                 addingToCart
//                     ? 'Adding…'
//                     : _qty == 1
//                         ? 'Add to Cart'
//                         : 'Add $_qty to Cart',
//                 style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
//               ),
//               style: ElevatedButton.styleFrom(
//                   backgroundColor: Colors.blue.shade700,
//                   foregroundColor: Colors.white,
//                   shape: RoundedRectangleBorder(
//                       borderRadius: BorderRadius.circular(10))),
//             ),
//           ),
//         ),
//       ]),
//     );
//   }

//   // ── Reviews ────────────────────────────────────────────────────────────────

//   Widget _buildReviewsSection() {
//     final isCustomer      = AuthService.currentUser?.role == 'CUSTOMER';
//     final canWriteReview  = isCustomer && _canReview && !_hasReviewed;

//     return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//       Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
//         Text('Reviews (${reviews.length})',
//             style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
//         if (isCustomer) ...[
//           if (canWriteReview)
//             TextButton.icon(
//               onPressed: _showReviewDialog,
//               icon: const Icon(Icons.edit, size: 16),
//               label: const Text('Write Review'),
//             )
//           else if (_hasReviewed)
//             Row(children: [
//               Icon(Icons.check_circle, size: 16, color: Colors.green.shade600),
//               const SizedBox(width: 4),
//               Text('Reviewed',
//                   style: TextStyle(color: Colors.green.shade600, fontSize: 13)),
//             ])
//           else if (!_canReview)
//             Tooltip(
//               message: 'You can review after the order is delivered',
//               child: Row(children: [
//                 Icon(Icons.lock_outline, size: 15, color: Colors.grey.shade500),
//                 const SizedBox(width: 4),
//                 Text('Delivered orders only',
//                     style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
//               ]),
//             ),
//         ],
//       ]),

//       if (isCustomer && !_canReview && !loadingReviews)
//         Container(
//           margin: const EdgeInsets.only(bottom: 10),
//           padding: const EdgeInsets.all(10),
//           decoration: BoxDecoration(
//               color: Colors.blue.shade50,
//               borderRadius: BorderRadius.circular(8),
//               border: Border.all(color: Colors.blue.shade100)),
//           child: Row(children: [
//             Icon(Icons.info_outline, size: 16, color: Colors.blue.shade700),
//             const SizedBox(width: 8),
//             Expanded(child: Text(
//               'Reviews are only available after you receive a delivered order of this product.',
//               style: TextStyle(color: Colors.blue.shade800, fontSize: 12),
//             )),
//           ]),
//         ),

//       const SizedBox(height: 10),

//       if (loadingReviews)
//         const Center(child: Padding(
//             padding: EdgeInsets.all(16),
//             child: CircularProgressIndicator()))
//       else if (reviews.isEmpty)
//         Container(
//           padding: const EdgeInsets.all(16),
//           decoration: BoxDecoration(
//               color: Colors.grey[50],
//               borderRadius: BorderRadius.circular(10),
//               border: Border.all(color: Colors.grey[200]!)),
//           child: Center(child: Text('No reviews yet. Be the first to review!',
//               style: TextStyle(color: Colors.grey[500]))),
//         )
//       else
//         ...reviews.map((r) => _buildReviewCard(r)),
//     ]);
//   }

//   Widget _buildReviewCard(Map<String, dynamic> r) {
//     final rating = (r['rating'] ?? 0) as int;
//     return Container(
//       margin: const EdgeInsets.only(bottom: 10),
//       padding: const EdgeInsets.all(12),
//       decoration: BoxDecoration(
//         color: Colors.white,
//         borderRadius: BorderRadius.circular(10),
//         border: Border.all(color: Colors.grey[200]!),
//         boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.06),
//             blurRadius: 4, offset: const Offset(0, 1))],
//       ),
//       child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//         Row(children: [
//           CircleAvatar(
//             radius: 16,
//             backgroundColor: Colors.blue.shade100,
//             child: Text(
//               ((r['customerName'] ?? 'A') as String).isNotEmpty
//                   ? (r['customerName'] as String)[0].toUpperCase() : 'A',
//               style: TextStyle(
//                   color: Colors.blue.shade700, fontWeight: FontWeight.bold),
//             ),
//           ),
//           const SizedBox(width: 10),
//           Expanded(child: Text(r['customerName'] ?? 'Anonymous',
//               style: const TextStyle(fontWeight: FontWeight.w600))),
//           Row(children: List.generate(5, (i) => Icon(
//               i < rating ? Icons.star : Icons.star_border,
//               color: Colors.amber, size: 16))),
//         ]),
//         if ((r['comment'] ?? '').toString().isNotEmpty) ...[
//           const SizedBox(height: 8),
//           Text(r['comment'],
//               style: TextStyle(color: Colors.grey[700], height: 1.4)),
//         ],
//       ]),
//     );
//   }
// }



import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../models/product_model.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../../services/activity_service.dart';
import '../../widgets/delivery_check_widget.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;
  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  bool addingToCart     = false;
  bool isWishlisted     = false;
  bool wishlistInFlight = false;
  int  selectedImage    = 0;

  // ── Quantity selector ──────────────────────────────────────────────────────
  int _qty = 1;

  List<Map<String, dynamic>> reviews = [];
  bool   loadingReviews  = true;
  double avgRating       = 0;

  int    selectedRating   = 5;
  final  commentCtrl      = TextEditingController();
  bool   submittingReview = false;

  bool _notifySubscribed = false;
  bool _notifyLoading    = true;
  bool _notifyInFlight   = false;

  List<Product> _relatedProducts = [];
  bool _loadingRelated = true;

  bool _canReview   = false;
  bool _hasReviewed = false;
  int  _reviewOrderId = 0;

  @override
  void initState() {
    super.initState();
    _checkWishlist();
    _loadReviews();
    if (widget.product.stock <= 0) _checkNotifyStatus();
    _checkCanReview();
    _loadRelatedProducts();
    ActivityService.productView(widget.product.id, widget.product.name);
  }

  @override
  void dispose() {
    commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkWishlist() async {
    if (AuthService.currentUser == null) return;
    final ids = await WishlistService.getWishlistIds();
    if (mounted) setState(() => isWishlisted = ids.contains(widget.product.id));
  }

  Future<void> _loadReviews() async {
    setState(() => loadingReviews = true);
    final res = await ReviewService.getProductReviews(widget.product.id);
    if (!mounted) return;
    final list = List<Map<String, dynamic>>.from(res['reviews'] ?? []);
    final avg = list.isEmpty
        ? 0.0
        : list.map((r) => (r['rating'] as num).toDouble()).reduce((a, b) => a + b) /
            list.length;
    final uid    = AuthService.currentUser?.id;
    final myName = AuthService.currentUser?.name ?? '';
    setState(() {
      reviews        = list;
      avgRating      = double.parse(avg.toStringAsFixed(1));
      loadingReviews = false;
      _hasReviewed   = uid != null &&
          list.any((r) =>
              (r['customerId'] != null && r['customerId'] == uid) ||
              (r['customerName'] ?? '') == myName);
    });
  }

  Future<void> _checkCanReview() async {
    if (AuthService.currentUser?.role != 'CUSTOMER') return;
    try {
      final orders = await OrderService.getOrders();
      for (final order in orders) {
        if (order.trackingStatus == 'DELIVERED') {
          if (order.items.any((item) => item.productId == widget.product.id)) {
            if (mounted) {
              setState(() { _canReview = true; _reviewOrderId = order.id; });
            }
            return;
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _checkNotifyStatus() async {
    final sub = await NotifyMeService.isSubscribed(widget.product.id);
    if (mounted) setState(() { _notifySubscribed = sub; _notifyLoading = false; });
  }

  Future<void> _loadRelatedProducts() async {
    final all = await ProductService.getProducts(category: widget.product.category);
    if (!mounted) return;
    setState(() {
      _relatedProducts = all.where((p) => p.id != widget.product.id).take(10).toList();
      _loadingRelated = false;
    });
  }

  Future<void> _toggleNotifyMe() async {
    if (_notifyInFlight) return;
    final wasSubscribed = _notifySubscribed;
    setState(() => _notifyInFlight = true);
    final res = wasSubscribed
        ? await NotifyMeService.unsubscribe(widget.product.id)
        : await NotifyMeService.subscribe(widget.product.id);
    if (!mounted) return;
    setState(() {
      _notifyInFlight = false;
      if (res['success'] == true) _notifySubscribed = !wasSubscribed;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['message'] ??
          (!wasSubscribed ? 'You will be notified!' : 'Notification removed')),
      backgroundColor: res['success'] == true ? Colors.green : Colors.red,
      behavior: SnackBarBehavior.floating,
    ));
  }

  Future<void> _addToCart() async {
    setState(() => addingToCart = true);
    final res = await CartService.addToCart(widget.product.id, _qty);
    setState(() => addingToCart = false);
    if (!mounted) return;
    if (res['success'] == true) {
      ActivityService.cartAdd(
          widget.product.id, widget.product.name, qty: _qty);
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['success'] == true
          ? _qty == 1 ? 'Added to cart!' : '$_qty items added to cart!'
          : res['message'] ?? 'Failed'),
      backgroundColor: res['success'] == true ? Colors.green : Colors.red,
      behavior: SnackBarBehavior.floating,
    ));
  }

  Future<void> _toggleWishlist() async {
    if (AuthService.currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please login to use wishlist')));
      return;
    }
    if (wishlistInFlight) return;
    final was = isWishlisted;
    setState(() { isWishlisted = !isWishlisted; wishlistInFlight = true; });
    final res = await WishlistService.toggle(widget.product.id);
    if (!mounted) return;
    if (res['success'] != true) {
      setState(() => isWishlisted = was);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['message'] ?? 'Wishlist update failed'),
          backgroundColor: Colors.red));
    }
    setState(() => wishlistInFlight = false);
  }

  String _buildShareText() {
    final p       = widget.product;
    final webLink = ApiConfig.productWebUrl(p.id);
    final desc    = p.description.isNotEmpty
        ? p.description.substring(
            0, p.description.length > 120 ? 120 : p.description.length)
        : '';
    return '🛍️ ${p.name}'
        '${p.isDiscounted ? '  •  ${p.discountPercent}% OFF' : ''}\n'
        '₹${p.price.toStringAsFixed(2)}'
        '${p.isDiscounted ? ' (was ₹${p.mrp.toStringAsFixed(0)})' : ''}\n'
        '${desc.isNotEmpty ? '$desc...\n' : ''}'
        '\nShop on Ekart 👉 $webLink';
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      // ignore: deprecated_member_use
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) throw Exception('Could not launch');
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: _buildShareText()));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Link copied — open your app and paste to share'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  void _shareProduct() {
    final shareText   = _buildShareText();
    final encodedText = Uri.encodeComponent(shareText);
    final webLink     = ApiConfig.productWebUrl(widget.product.id);
    final encodedLink = Uri.encodeComponent(webLink);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2))),
          const Text('Share Product',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(widget.product.name,
              maxLines: 1, overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          const SizedBox(height: 20),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _shareIcon(icon: Icons.message_rounded, color: const Color(0xFF25D366),
                label: 'WhatsApp', onTap: () { Navigator.pop(context);
                  _launchUrl('https://wa.me/?text=$encodedText'); }),
            _shareIcon(icon: Icons.send_rounded, color: const Color(0xFF0088CC),
                label: 'Telegram', onTap: () { Navigator.pop(context);
                  _launchUrl('https://t.me/share/url?url=$encodedLink&text=$encodedText'); }),
            _shareIcon(icon: Icons.camera_alt_rounded, color: const Color(0xFFE1306C),
                label: 'Instagram', onTap: () {
                  Navigator.pop(context);
                  Clipboard.setData(ClipboardData(text: shareText)).then((_) {
                    _launchUrl('instagram://app');
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Link copied — paste in Instagram DM'),
                              behavior: SnackBarBehavior.floating,
                              duration: Duration(seconds: 3)));
                    }
                  });
                }),
            _shareIcon(icon: Icons.email_rounded, color: const Color(0xFFEA4335),
                label: 'Gmail', onTap: () {
                  Navigator.pop(context);
                  final subject = Uri.encodeComponent(
                      'Check out ${widget.product.name} on Ekart!');
                  _launchUrl('mailto:?subject=$subject&body=$encodedText');
                }),
          ]),
          const SizedBox(height: 20),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _shareIcon(icon: Icons.sms_rounded, color: const Color(0xFF34A853),
                label: 'SMS', onTap: () { Navigator.pop(context);
                  _launchUrl('sms:?body=$encodedText'); }),
            _shareIcon(icon: Icons.facebook_rounded, color: const Color(0xFF1877F2),
                label: 'Facebook', onTap: () { Navigator.pop(context);
                  _launchUrl('https://www.facebook.com/sharer/sharer.php?u=$encodedLink'); }),
            _shareIcon(icon: Icons.chat_bubble_rounded, color: const Color(0xFF128C7E),
                label: 'WA Business', onTap: () { Navigator.pop(context);
                  _launchUrl('https://wa.me/?text=$encodedText'); }),
            _shareIcon(icon: Icons.link_rounded, color: Colors.blue.shade700,
                label: 'Copy Link', onTap: () {
                  Navigator.pop(context);
                  Clipboard.setData(ClipboardData(text: shareText));
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: const Row(children: [
                      Icon(Icons.check_circle, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text('Product link copied!'),
                    ]),
                    backgroundColor: Colors.green.shade700,
                    behavior: SnackBarBehavior.floating,
                    duration: const Duration(seconds: 2),
                  ));
                }),
          ]),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Icon(Icons.link, size: 16, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              Expanded(
                child: Text(ApiConfig.productWebUrl(widget.product.id),
                    style: TextStyle(
                        color: Colors.blue.shade700, fontSize: 12,
                        decoration: TextDecoration.underline),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(
                      text: ApiConfig.productWebUrl(widget.product.id)));
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Link copied!'),
                      behavior: SnackBarBehavior.floating,
                      duration: Duration(seconds: 2)));
                },
                child: Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Icon(Icons.copy, size: 16, color: Colors.grey.shade500),
                ),
              ),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _shareIcon({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 54, height: 54,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: color.withValues(alpha: 0.30),
                  blurRadius: 8, offset: const Offset(0, 3))]),
          child: Icon(icon, color: Colors.white, size: 26),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
      ]),
    );
  }

  Future<void> _submitReview() async {
    if (commentCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Please write a comment'),
          backgroundColor: Colors.red));
      return;
    }
    setState(() => submittingReview = true);
    final res = await ReviewService.addReview(
      productId: widget.product.id,
      orderId:   _reviewOrderId,
      rating:    selectedRating,
      comment:   commentCtrl.text.trim(),
    );
    setState(() => submittingReview = false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['message'] ??
          (res['success'] == true ? 'Review submitted!' : 'Failed')),
      backgroundColor: res['success'] == true ? Colors.green : Colors.red,
    ));
    if (res['success'] == true) {
      commentCtrl.clear();
      setState(() { selectedRating = 5; _hasReviewed = true; });
      Navigator.pop(context);
      _loadReviews();
    }
  }

  void _showReviewDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
              left: 20, right: 20, top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Text('Write a Review',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context)),
            ]),
            const SizedBox(height: 4),
            Text(widget.product.name,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            const SizedBox(height: 16),
            const Text('Your Rating', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(children: List.generate(5, (i) => GestureDetector(
              onTap: () {
                setS(() => selectedRating = i + 1);
                setState(() => selectedRating = i + 1);
              },
              child: Padding(
                padding: const EdgeInsets.only(right: 4),
                child: Icon(
                    i < selectedRating ? Icons.star : Icons.star_border,
                    color: Colors.amber, size: 38),
              ),
            ))),
            const SizedBox(height: 16),
            TextField(
              controller: commentCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Share your experience with this product...',
                border: OutlineInputBorder(),
                counterText: '',
              ),
              maxLength: 500,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: submittingReview ? null : _submitReview,
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    padding: const EdgeInsets.symmetric(vertical: 14)),
                child: submittingReview
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Submit Review',
                        style: TextStyle(color: Colors.white, fontSize: 15)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p            = widget.product;
    final images       = [if (p.imageLink.isNotEmpty) p.imageLink, ...p.extraImages];
    final isOutOfStock = p.stock <= 0;
    final maxQty       = isOutOfStock ? 0 : p.stock.clamp(1, 10);

    return Scaffold(
      appBar: AppBar(
        title: Text(p.name, overflow: TextOverflow.ellipsis),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
              icon: const Icon(Icons.share),
              tooltip: 'Share Product',
              onPressed: _shareProduct),
          IconButton(
            icon: wishlistInFlight
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2.5))
                : Icon(isWishlisted ? Icons.favorite : Icons.favorite_border,
                    color: isWishlisted ? Colors.red.shade300 : Colors.white),
            onPressed: wishlistInFlight ? null : _toggleWishlist,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // ── Main image ───────────────────────────────────────────────────
          Stack(children: [
            images.isNotEmpty
                ? Image.network(images[selectedImage],
                    height: 280, width: double.infinity, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                        height: 280, color: Colors.grey[200],
                        child: const Icon(Icons.image_not_supported, size: 80)))
                : Container(height: 280, color: Colors.grey[200],
                    child: const Icon(Icons.image, size: 80)),
            if (p.isDiscounted)
              Positioned(top: 12, left: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: Colors.red, borderRadius: BorderRadius.circular(20)),
                  child: Text('${p.discountPercent}% OFF',
                      style: const TextStyle(color: Colors.white,
                          fontWeight: FontWeight.bold, fontSize: 12)),
                )),
            if (isOutOfStock)
              Positioned(top: 12, right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: Colors.red.shade700,
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text('Out of Stock',
                      style: TextStyle(color: Colors.white,
                          fontWeight: FontWeight.bold, fontSize: 12)),
                )),
          ]),

          // ── Thumbnail strip ──────────────────────────────────────────────
          if (images.length > 1)
            SizedBox(
              height: 80,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(8),
                itemCount: images.length,
                itemBuilder: (_, i) => GestureDetector(
                  onTap: () => setState(() => selectedImage = i),
                  child: Container(
                    width: 64, height: 64,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      border: Border.all(
                          color: selectedImage == i
                              ? Colors.blue.shade700 : Colors.grey[300]!,
                          width: 2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.network(images[i], fit: BoxFit.cover),
                    ),
                  ),
                ),
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

              // ── Price & Stock ──────────────────────────────────────────
              Row(children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('₹${p.price.toStringAsFixed(2)}',
                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700)),
                  if (p.isDiscounted)
                    Text('MRP ₹${p.mrp.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 14,
                            decoration: TextDecoration.lineThrough,
                            color: Colors.grey)),
                ]),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: p.stock > 0 ? Colors.green.shade50 : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: p.stock > 0 ? Colors.green : Colors.red),
                  ),
                  child: Text(
                    p.stock > 0 ? '${p.stock} In Stock' : 'Out of Stock',
                    style: TextStyle(
                        color: p.stock > 0
                            ? Colors.green.shade700 : Colors.red,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Text(p.name,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Row(children: [
                Icon(Icons.category, size: 16, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(p.category, style: TextStyle(color: Colors.grey[600])),
              ]),
              if (p.vendorCode != null) ...[
                const SizedBox(height: 4),
                Row(children: [
                  Icon(Icons.store, size: 16, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text('Sold by: ${p.vendorCode}',
                      style: TextStyle(color: Colors.grey[600])),
                ]),
              ],
              if (!loadingReviews && reviews.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(children: [
                  const Icon(Icons.star, color: Colors.amber, size: 18),
                  const SizedBox(width: 4),
                  Text('$avgRating',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(' (${reviews.length} reviews)',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                ]),
              ],

              // ── Return & Refund Policy badge (NEW) ─────────────────────
              const SizedBox(height: 12),
              _buildReturnPolicyBadge(p),

              // ── Share row ──────────────────────────────────────────────
              const SizedBox(height: 12),
              Row(children: [
                OutlinedButton.icon(
                  onPressed: _shareProduct,
                  icon: const Icon(Icons.share, size: 16),
                  label: const Text('Share Product'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.blue.shade700,
                    side: BorderSide(color: Colors.blue.shade300),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                  ),
                ),
              ]),

              const Divider(height: 28),

              // ── Quantity selector (NEW) ────────────────────────────────
              if (!isOutOfStock) ...[
                _buildQuantitySelector(p, maxQty),
                const SizedBox(height: 16),
              ],

              const Text('Description',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                p.description.isNotEmpty
                    ? p.description : 'No description available.',
                style: TextStyle(color: Colors.grey[700], height: 1.5),
              ),

              // ── Notify Me (out of stock only) ──────────────────────────
              if (isOutOfStock) ...[
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 8),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.notifications_outlined,
                      color: Colors.orange.shade700, size: 22),
                  const SizedBox(width: 10),
                  Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Currently Unavailable',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text('Get notified as soon as this item is back in stock.',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                    const SizedBox(height: 10),
                    if (_notifyLoading)
                      const SizedBox(height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2))
                    else
                      ElevatedButton.icon(
                        onPressed: _notifyInFlight ? null : _toggleNotifyMe,
                        icon: _notifyInFlight
                            ? const SizedBox(width: 16, height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : Icon(_notifySubscribed
                                ? Icons.notifications_active
                                : Icons.notifications_none, size: 18),
                        label: Text(_notifySubscribed
                            ? 'You\'re notified ✓'
                            : 'Notify Me When Available'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _notifySubscribed
                              ? Colors.green.shade600 : Colors.orange.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                  ])),
                ]),
              ],

              // ── Delivery PIN Checker ───────────────────────────────────
              const SizedBox(height: 20),
              DeliveryCheckWidget(allowedPinCodes: widget.product.allowedPinCodes),

              const SizedBox(height: 24),

              // ── Reviews ───────────────────────────────────────────────
              _buildReviewsSection(),

              const SizedBox(height: 32),

              // ── Related Products ───────────────────────────────────────
              _buildRelatedProducts(),

              const SizedBox(height: 32),
            ]),
          ),
        ]),
      ),

      // ── Bottom bar: Qty selector + Add to Cart ─────────────────────────
      bottomNavigationBar: _buildBottomBar(p, isOutOfStock, maxQty),
    );
  }

  // ── Return Policy Badge ────────────────────────────────────────────────────

  Widget _buildReturnPolicyBadge(Product p) {
    if (p.returnsAccepted) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.green.shade200),
        ),
        child: Row(children: [
          Icon(Icons.assignment_return, size: 16, color: Colors.green.shade700),
          const SizedBox(width: 8),
          Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('7-Day Returns & Refunds',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.green.shade800,
                    fontSize: 13)),
            Text(
              'The vendor accepts returns and refunds within 7 days of delivery.',
              style: TextStyle(fontSize: 11, color: Colors.green.shade700),
            ),
          ])),
        ]),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.red.shade200),
        ),
        child: Row(children: [
          Icon(Icons.block, size: 16, color: Colors.red.shade700),
          const SizedBox(width: 8),
          Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('No Returns or Refunds',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade800,
                    fontSize: 13)),
            Text(
              'The vendor does not offer returns or refunds for this product.',
              style: TextStyle(fontSize: 11, color: Colors.red.shade700),
            ),
          ])),
        ]),
      );
    }
  }

  // ── Quantity Selector ──────────────────────────────────────────────────────

  Widget _buildQuantitySelector(Product p, int maxQty) {
    return Row(children: [
      const Text('Quantity',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
      const SizedBox(width: 16),
      Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          // Decrement
          InkWell(
            onTap: _qty > 1 ? () => setState(() => _qty--) : null,
            borderRadius: const BorderRadius.horizontal(left: Radius.circular(7)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Icon(Icons.remove,
                  size: 18,
                  color: _qty > 1 ? Colors.grey.shade700 : Colors.grey.shade300),
            ),
          ),
          // Value
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border.symmetric(
                  vertical: BorderSide(color: Colors.grey.shade300)),
            ),
            child: Text('$_qty',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          // Increment
          InkWell(
            onTap: _qty < maxQty ? () => setState(() => _qty++) : null,
            borderRadius: const BorderRadius.horizontal(right: Radius.circular(7)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Icon(Icons.add,
                  size: 18,
                  color: _qty < maxQty
                      ? Colors.grey.shade700 : Colors.grey.shade300),
            ),
          ),
        ]),
      ),
      const SizedBox(width: 12),
      // Max stock indicator
      if (p.stock <= 5)
        Text('Only ${p.stock} left!',
            style: TextStyle(
                color: Colors.orange.shade700,
                fontSize: 12,
                fontWeight: FontWeight.w500)),
    ]);
  }

  // ── Bottom Bar ─────────────────────────────────────────────────────────────

  Widget _buildBottomBar(Product p, bool isOutOfStock, int maxQty) {
    if (isOutOfStock) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 52,
          child: OutlinedButton.icon(
            onPressed: null,
            icon: const Icon(Icons.remove_shopping_cart),
            label: const Text('Out of Stock',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10))),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.grey.withValues(alpha: 0.15),
              blurRadius: 10, offset: const Offset(0, -3)),
        ],
      ),
      child: Row(children: [
        // Compact qty selector in bottom bar
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            InkWell(
              onTap: _qty > 1 ? () => setState(() => _qty--) : null,
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(7)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                child: Icon(Icons.remove, size: 16,
                    color: _qty > 1 ? Colors.grey.shade700 : Colors.grey.shade300),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
              decoration: BoxDecoration(
                border: Border.symmetric(
                    vertical: BorderSide(color: Colors.grey.shade300)),
              ),
              child: Text('$_qty',
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.bold)),
            ),
            InkWell(
              onTap: _qty < maxQty ? () => setState(() => _qty++) : null,
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(7)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                child: Icon(Icons.add, size: 16,
                    color: _qty < maxQty
                        ? Colors.grey.shade700 : Colors.grey.shade300),
              ),
            ),
          ]),
        ),
        const SizedBox(width: 12),
        // Add to Cart
        Expanded(
          child: SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              onPressed: addingToCart ? null : _addToCart,
              icon: addingToCart
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.add_shopping_cart),
              label: Text(
                addingToCart
                    ? 'Adding…'
                    : _qty == 1
                        ? 'Add to Cart'
                        : 'Add $_qty to Cart',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10))),
            ),
          ),
        ),
      ]),
    );
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  Widget _buildReviewsSection() {
    final isCustomer      = AuthService.currentUser?.role == 'CUSTOMER';
    final canWriteReview  = isCustomer && _canReview && !_hasReviewed;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text('Reviews (${reviews.length})',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        if (isCustomer) ...[
          if (canWriteReview)
            TextButton.icon(
              onPressed: _showReviewDialog,
              icon: const Icon(Icons.edit, size: 16),
              label: const Text('Write Review'),
            )
          else if (_hasReviewed)
            Row(children: [
              Icon(Icons.check_circle, size: 16, color: Colors.green.shade600),
              const SizedBox(width: 4),
              Text('Reviewed',
                  style: TextStyle(color: Colors.green.shade600, fontSize: 13)),
            ])
          else if (!_canReview)
            Tooltip(
              message: 'You can review after the order is delivered',
              child: Row(children: [
                Icon(Icons.lock_outline, size: 15, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Text('Delivered orders only',
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ]),
            ),
        ],
      ]),

      if (isCustomer && !_canReview && !loadingReviews)
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade100)),
          child: Row(children: [
            Icon(Icons.info_outline, size: 16, color: Colors.blue.shade700),
            const SizedBox(width: 8),
            Expanded(child: Text(
              'Reviews are only available after you receive a delivered order of this product.',
              style: TextStyle(color: Colors.blue.shade800, fontSize: 12),
            )),
          ]),
        ),

      const SizedBox(height: 10),

      if (loadingReviews)
        const Center(child: Padding(
            padding: EdgeInsets.all(16),
            child: CircularProgressIndicator()))
      else if (reviews.isEmpty)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.grey[200]!)),
          child: Center(child: Text('No reviews yet. Be the first to review!',
              style: TextStyle(color: Colors.grey[500]))),
        )
      else
        ...reviews.map((r) => _buildReviewCard(r)),
    ]);
  }

  Widget _buildReviewCard(Map<String, dynamic> r) {
    final rating = (r['rating'] ?? 0) as int;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.06),
            blurRadius: 4, offset: const Offset(0, 1))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: Colors.blue.shade100,
            child: Text(
              ((r['customerName'] ?? 'A') as String).isNotEmpty
                  ? (r['customerName'] as String)[0].toUpperCase() : 'A',
              style: TextStyle(
                  color: Colors.blue.shade700, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(r['customerName'] ?? 'Anonymous',
              style: const TextStyle(fontWeight: FontWeight.w600))),
          Row(children: List.generate(5, (i) => Icon(
              i < rating ? Icons.star : Icons.star_border,
              color: Colors.amber, size: 16))),
        ]),
        if ((r['comment'] ?? '').toString().isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(r['comment'],
              style: TextStyle(color: Colors.grey[700], height: 1.4)),
        ],
      ]),
    );
  }

  // ── Related Products ───────────────────────────────────────────────────────

  Widget _buildRelatedProducts() {
    if (_loadingRelated) {
      return const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Related Products',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        SizedBox(height: 12),
        Center(child: Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: CircularProgressIndicator())),
      ]);
    }
    if (_relatedProducts.isEmpty) return const SizedBox.shrink();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Related Products',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(widget.product.category,
              style: TextStyle(fontSize: 11, color: Colors.blue.shade700,
                  fontWeight: FontWeight.w500)),
        ),
      ]),
      const SizedBox(height: 12),
      SizedBox(
        height: 210,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          itemCount: _relatedProducts.length,
          itemBuilder: (_, i) => _buildRelatedCard(_relatedProducts[i]),
        ),
      ),
    ]);
  }

  Widget _buildRelatedCard(Product p) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)),
      ),
      child: Container(
        width: 140,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.08),
              blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Image
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
            child: Stack(children: [
              p.imageLink.isNotEmpty
                  ? Image.network(p.imageLink,
                      height: 110, width: 140, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                          height: 110, color: Colors.grey[200],
                          child: const Icon(Icons.image_not_supported, size: 36)))
                  : Container(height: 110, color: Colors.grey[200],
                      child: const Icon(Icons.image, size: 36)),
              if (p.isDiscounted)
                Positioned(top: 6, left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: Colors.red, borderRadius: BorderRadius.circular(10)),
                    child: Text('${p.discountPercent}% OFF',
                        style: const TextStyle(color: Colors.white,
                            fontWeight: FontWeight.bold, fontSize: 9)),
                  )),
            ]),
          ),
          // Info
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                      height: 1.3)),
              const SizedBox(height: 4),
              Text('₹${p.price.toStringAsFixed(0)}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold,
                      color: Colors.blue.shade700)),
              if (p.isDiscounted)
                Text('₹${p.mrp.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 10,
                        decoration: TextDecoration.lineThrough,
                        color: Colors.grey)),
            ]),
          ),
        ]),
      ),
    );
  }
}