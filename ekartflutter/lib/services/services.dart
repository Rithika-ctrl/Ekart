// // import 'dart:convert';
// // import 'package:http/http.dart' as http;
// // import '../config/api_config.dart';
// // import '../models/product_model.dart';
// // import '../models/order_model.dart';
// // import 'auth_service.dart';

// // // ─── helpers ────────────────────────────────────────────────────────────────

// // Map<String, String> _customerHeaders() => {
// //       'Content-Type': 'application/json',
// //       'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
// //     };

// // Map<String, String> _vendorHeaders() => {
// //       'Content-Type': 'application/json',
// //       'X-Vendor-Id': '${AuthService.currentUser?.id ?? 0}',
// //     };


// // Map<String, dynamic> _safeParse(http.Response r) {
// //   final body = r.body.trim();
// //   // HTML response (Spring error page / redirect) — not JSON
// //   if (body.startsWith('<') || body.isEmpty) {
// //     return {'success': false, 'message': 'Server error (HTTP ${r.statusCode}). Check backend.'};
// //   }
// //   try {
// //     final decoded = jsonDecode(body) as Map<String, dynamic>;
// //     // If the backend returned a non-2xx status but with a JSON body,
// //     // make sure 'success' is false so callers always get correct behaviour.
// //     if (r.statusCode >= 400 && decoded['success'] == null) {
// //       decoded['success'] = false;
// //     }
// //     return decoded;
// //   } catch (e) {
// //     return {'success': false, 'message': 'Invalid response (HTTP ${r.statusCode}): $e'};
// //   }
// // }

// // // ─── ProductService ──────────────────────────────────────────────────────────

// // class ProductService {
// //   static Future<List<Product>> getProducts({
// //     String? search,
// //     String? category,
// //     double? minPrice,
// //     double? maxPrice,
// //     String? sortBy,
// //   }) async {
// //     try {
// //       final params = <String, String>{};
// //       if (search != null && search.isNotEmpty) params['search'] = search;
// //       if (category != null && category.isNotEmpty) params['category'] = category;
// //       if (minPrice != null) params['minPrice'] = minPrice.toString();
// //       if (maxPrice != null) params['maxPrice'] = maxPrice.toString();
// //       if (sortBy != null && sortBy.isNotEmpty) params['sortBy'] = sortBy;
// //       final uri = Uri.parse(ApiConfig.products).replace(queryParameters: params);
// //       final r = await http.get(uri);
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return (d['products'] as List)
// //             .map((e) => Product.fromJson(e as Map<String, dynamic>))
// //             .toList();
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<List<String>> getCategories() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.categories));
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<String>.from(d['categories'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getProductDetail(int id) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.productById(id)));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── OrderService ────────────────────────────────────────────────────────────

// // class OrderService {
// //   static Future<List<Order>> getOrders() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.orders), headers: _customerHeaders());
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return (d['orders'] as List)
// //             .map((e) => Order.fromJson(e as Map<String, dynamic>))
// //             .toList();
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getOrderById(int id) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.orderById(id)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> placeOrder({
// //     required String paymentMode,
// //     required String city,
// //     required String deliveryTime,
// //     String? couponCode,
// //   }) async {
// //     try {
// //       final body = <String, dynamic>{
// //         'paymentMode': paymentMode,
// //         'city': city,
// //         'deliveryTime': deliveryTime,
// //       };
// //       if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
// //       final r = await http.post(Uri.parse(ApiConfig.placeOrder),
// //           headers: _customerHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Place an order with a fully structured address
// //   static Future<Map<String, dynamic>> placeOrderStructured({
// //     required String paymentMode,
// //     required String recipientName,
// //     required String houseStreet,
// //     required String city,
// //     required String state,
// //     required String postalCode,
// //     required String deliveryTime,
// //     String? couponCode,
// //   }) async {
// //     try {
// //       final body = <String, dynamic>{
// //         'paymentMode':   paymentMode,
// //         'recipientName': recipientName,
// //         'houseStreet':   houseStreet,
// //         'city':          city,
// //         'state':         state,
// //         'postalCode':    postalCode,
// //         'deliveryTime':  deliveryTime,
// //       };
// //       if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
// //       final r = await http.post(Uri.parse(ApiConfig.placeOrder),
// //           headers: _customerHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> cancelOrder(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.cancelOrder(id)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> reorder(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.reorder(id)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Pre-check stock levels before confirming a reorder.
// //   /// Returns: { success, items: [ { productId, productName, requestedQty,
// //   ///   availableStock, canAdd, status: 'OK'|'LOW'|'OUT_OF_STOCK' } ] }
// //   static Future<Map<String, dynamic>> reorderStockCheck(int id) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.reorderStockCheck(id)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> trackOrder(int id) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.trackOrder(id)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> reportIssue(int id,
// //       {required String reason, String? description}) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.reportIssue(id)),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'reason': reason, 'description': description ?? ''}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── CouponService ───────────────────────────────────────────────────────────

// // class CouponService {
// //   static Future<List<Map<String, dynamic>>> getActiveCoupons() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.activeCoupons));
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> applyCoupon(String code) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.cartCoupon),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'code': code}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> removeCoupon() async {
// //     try {
// //       final r = await http.delete(Uri.parse(ApiConfig.cartCoupon),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Legacy: validate coupon with amount (kept for checkout compatibility)
// //   static Future<Map<String, dynamic>> validateCoupon(
// //       String code, double orderAmount) async {
// //     try {
// //       final uri = Uri.parse(ApiConfig.validateCoupon).replace(queryParameters: {
// //         'code': code,
// //         'amount': orderAmount.toString(),
// //       });
// //       final r = await http.get(uri, headers: {'Content-Type': 'application/json'});
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── WishlistService ─────────────────────────────────────────────────────────

// // class WishlistService {
// //   static Future<Set<int>> getWishlistIds() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.wishlistIds),
// //           headers: _customerHeaders());
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return Set<int>.from((d['ids'] as List? ?? []).map((e) => e as int));
// //       }
// //       return {};
// //     } catch (_) {
// //       return {};
// //     }
// //   }

// //   static Future<List<Map<String, dynamic>>> getWishlist() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.wishlist),
// //           headers: _customerHeaders());
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['items'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> toggle(int productId) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.wishlistToggle),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'productId': productId}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── ReviewService ───────────────────────────────────────────────────────────

// // class ReviewService {
// //   static Future<Map<String, dynamic>> getProductReviews(int productId) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.productReviews(productId)));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> addReview({
// //     required int productId,
// //     required int orderId,
// //     required int rating,
// //     required String comment,
// //   }) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.addReview),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({
// //             'productId': productId,
// //             'orderId':   orderId,
// //             'rating':    rating,
// //             'comment':   comment,
// //           }));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Submit a review and then upload photos (up to 5) as a multipart follow-up.
// //   /// Photos are posted to /api/flutter/reviews/{reviewId}/upload-images.
// //   static Future<Map<String, dynamic>> addReviewWithPhotos({
// //     required int    productId,
// //     required int    orderId,
// //     required int    rating,
// //     required String comment,
// //     required List<String> photoPaths, // local file paths
// //   }) async {
// //     // Step 1 — submit text review
// //     Map<String, dynamic> reviewRes;
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.addReview),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({
// //             'productId': productId,
// //             'orderId':   orderId,
// //             'rating':    rating,
// //             'comment':   comment,
// //           }));
// //       reviewRes = _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }

// //     if (reviewRes['success'] != true || photoPaths.isEmpty) {
// //       return reviewRes;
// //     }

// //     // Step 2 — upload photos to the returned reviewId
// //     final reviewId = reviewRes['reviewId'] as int?;
// //     if (reviewId == null) return reviewRes; // no id to attach photos to

// //     try {
// //       final uploadUrl =
// //           '${ApiConfig.base}/reviews/$reviewId/upload-images';
// //       final request = http.MultipartRequest('POST', Uri.parse(uploadUrl))
// //         ..headers.addAll({
// //           'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
// //         });
// //       for (final path in photoPaths.take(5)) {
// //         request.files.add(await http.MultipartFile.fromPath('images', path));
// //       }
// //       final streamed = await request.send();
// //       final resp     = await http.Response.fromStream(streamed);
// //       final body     = resp.body.trim();
// //       if (!body.startsWith('<') && body.isNotEmpty) {
// //         final d = jsonDecode(body) as Map<String, dynamic>;
// //         reviewRes['photosUploaded'] = d['uploaded'] ?? photoPaths.length;
// //       }
// //     } catch (_) {
// //       // Photos upload failed, but the review itself succeeded
// //       reviewRes['photosUploaded'] = 0;
// //       reviewRes['photosError']    = 'Photo upload failed';
// //     }

// //     return reviewRes;
// //   }
// // }

// // // ─── CartService ─────────────────────────────────────────────────────────────

// // class CartService {
// //   static Future<Map<String, dynamic>> getCart() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.cart), headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> addToCart(int productId, int qty) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.cartAdd),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'productId': productId, 'quantity': qty}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> updateCart(int productId, int qty) async {
// //     try {
// //       final r = await http.put(Uri.parse(ApiConfig.cartUpdate),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'productId': productId, 'quantity': qty}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> removeFromCart(int productId) async {
// //     try {
// //       final r = await http.delete(Uri.parse(ApiConfig.cartRemove(productId)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── ProfileService ───────────────────────────────────────────────────────────

// // class ProfileService {
// //   static Future<Map<String, dynamic>> getProfile() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.profile), headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
// //     try {
// //       final r = await http.put(Uri.parse(ApiConfig.profileUpdate),
// //           headers: _customerHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> addAddress(Map<String, String> body) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.addAddress),
// //           headers: _customerHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> deleteAddress(int id) async {
// //     try {
// //       final r = await http.delete(Uri.parse(ApiConfig.deleteAddress(id)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> changePassword(
// //       String current, String newPwd) async {
// //     try {
// //       final r = await http.put(Uri.parse(ApiConfig.changePassword),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'currentPassword': current, 'newPassword': newPwd}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── RefundService ───────────────────────────────────────────────────────────

// // class RefundService {
// //   static Future<Map<String, dynamic>> requestRefund({
// //     required int orderId,
// //     required String reason,
// //   }) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.refundRequest),
// //           headers: _customerHeaders(),
// //           body: jsonEncode({'orderId': orderId, 'reason': reason}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getRefundStatus(int orderId) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.refundStatus(orderId)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Fetch all refund/replacement requests for the logged-in customer.
// //   /// Returns: { success, refunds: [ { refundId, orderId, orderDate, type,
// //   ///             reason, status, amount, adminNote } ] }
// //   static Future<Map<String, dynamic>> getMyRefunds() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.myRefunds),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Fetch evidence image URLs for a specific refund.
// //   /// Returns: { success, images: [ url1, url2, ... ] }
// //   static Future<Map<String, dynamic>> getRefundImages(int refundId) async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.refundImages(refundId)),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── SpendingService ─────────────────────────────────────────────────────────

// // class SpendingService {
// //   static Future<Map<String, dynamic>> getSummary() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.spendingSummary),
// //           headers: _customerHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── VendorService ───────────────────────────────────────────────────────────

// // class VendorService {
// //   static Future<Map<String, dynamic>> getStats() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.vendorStats),
// //           headers: _vendorHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<List<Product>> getProducts() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.vendorProducts),
// //           headers: _vendorHeaders());
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return (d['products'] as List)
// //             .map((e) => Product.fromJson(e as Map<String, dynamic>))
// //             .toList();
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<List<Map<String, dynamic>>> getOrders() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.vendorOrders),
// //           headers: _vendorHeaders());
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['orders'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> addProduct(Map<String, dynamic> body) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.vendorAddProduct),
// //           headers: _vendorHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> updateProduct(
// //       int id, Map<String, dynamic> body) async {
// //     try {
// //       final r = await http.put(Uri.parse(ApiConfig.vendorUpdateProduct(id)),
// //           headers: _vendorHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> deleteProduct(int id) async {
// //     try {
// //       final r = await http.delete(Uri.parse(ApiConfig.vendorDeleteProduct(id)),
// //           headers: _vendorHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getSalesReport({String period = 'weekly'}) async {
// //     try {
// //       final uri = Uri.parse(ApiConfig.vendorSalesReport)
// //           .replace(queryParameters: {'period': period});
// //       final r = await http.get(uri, headers: _vendorHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getProfile() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.vendorProfile),
// //           headers: _vendorHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
// //     try {
// //       final r = await http.put(Uri.parse(ApiConfig.vendorProfileUpdate),
// //           headers: _vendorHeaders(), body: jsonEncode(body));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getStockAlerts() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.vendorStockAlerts),
// //           headers: _vendorHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> acknowledgeAlert(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.acknowledgeAlert(id)),
// //           headers: _vendorHeaders());
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// Mark an order item as ready for pickup
// //   static Future<Map<String, dynamic>> markOrderReady(int orderId) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.vendorMarkOrderReady(orderId)),
// //         headers: _vendorHeaders(),
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── AdminService ────────────────────────────────────────────────────────────

// // class AdminService {
// //   static Map<String, String> get _headers => {'Content-Type': 'application/json'};

// //   static Future<Map<String, dynamic>> getUsers() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.adminUsers), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getProducts() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.adminProducts), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> getOrders() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.adminOrders), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> approveProduct(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.adminApproveProduct(id)),
// //           headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> rejectProduct(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.adminRejectProduct(id)),
// //           headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> approveAllProducts() async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminApproveAll),
// //         headers: _headers,
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> toggleCustomer(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.adminToggleCustomer(id)),
// //           headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> toggleVendor(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.adminToggleVendor(id)),
// //           headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> updateOrderStatus(int id, String status) async {
// //     try {
// //       final r = await http.post(Uri.parse(ApiConfig.adminOrderStatus(id)),
// //           headers: _headers, body: jsonEncode({'status': status}));
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   // ── Coupon management ──────────────────────────────────────────────────────
// //   static Future<List<Map<String, dynamic>>> getCoupons() async {
// //     try {
// //       final r = await http.get(
// //         Uri.parse(ApiConfig.adminCoupons),
// //         headers: _headers,
// //       );
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> createCoupon(Map<String, dynamic> body) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminCreateCoupon),
// //         headers: _headers,
// //         body: jsonEncode(body),
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> toggleCoupon(int id) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminToggleCoupon(id)),
// //         headers: _headers,
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> deleteCoupon(int id) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminDeleteCoupon(id)),
// //         headers: _headers,
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   // ── Refund management ──────────────────────────────────────────────────────
// //   static Future<List<Map<String, dynamic>>> getRefunds() async {
// //     try {
// //       final r = await http.get(
// //         Uri.parse(ApiConfig.adminRefunds),
// //         headers: _headers,
// //       );
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['refunds'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<Map<String, dynamic>> processRefund(
// //       int orderId, String action) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminProcessRefund(orderId)),
// //         headers: _headers,
// //         body: jsonEncode({'action': action}),
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   // ── Delivery management ───────────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getDeliveryData() async {
// //     try {
// //       final r = await http.get(
// //         Uri.parse(ApiConfig.adminDeliveryData),
// //         headers: _headers,
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> approveDeliveryBoy(
// //       int deliveryBoyId, {String assignedPinCodes = ''}) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminApproveDelivery),
// //         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
// //         body: 'deliveryBoyId=$deliveryBoyId&assignedPinCodes=${Uri.encodeComponent(assignedPinCodes)}',
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> rejectDeliveryBoy(
// //       int deliveryBoyId, {String reason = ''}) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminRejectDelivery),
// //         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
// //         body: 'deliveryBoyId=$deliveryBoyId&reason=${Uri.encodeComponent(reason)}',
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> assignDeliveryBoy(
// //       int orderId, int deliveryBoyId) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.adminAssignDelivery),
// //         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
// //         body: 'orderId=$orderId&deliveryBoyId=$deliveryBoyId',
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   // ── Platform stats ────────────────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getStats() async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/stats'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   // ── Account management ────────────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getAccounts({String? search}) async {
// //     try {
// //       final uri = Uri.parse('${ApiConfig.base}/admin/accounts')
// //           .replace(queryParameters: search != null && search.isNotEmpty ? {'search': search} : null);
// //       final r = await http.get(uri, headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> getAccountStats() async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/stats'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> getAccountProfile(int id) async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/$id/profile'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> toggleAccount(int id, bool isActive) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/toggle'),
// //           headers: _headers, body: jsonEncode({'isActive': isActive}));
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> resetAccountPassword(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/reset-password'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> deleteAccount(int id) async {
// //     try {
// //       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/accounts/$id'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   // ── Review management ─────────────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getReviews({String filter = 'all', String search = ''}) async {
// //     try {
// //       final uri = Uri.parse('${ApiConfig.base}/admin/reviews')
// //           .replace(queryParameters: {'filter': filter, 'search': search});
// //       final r = await http.get(uri, headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> deleteReview(int id) async {
// //     try {
// //       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/reviews/$id'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> bulkDeleteReviews(String productName) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/reviews/bulk-delete'),
// //           headers: _headers, body: jsonEncode({'productName': productName}));
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   // ── Banner management ─────────────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getBanners() async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/banners'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> addBanner(String title, String imageUrl, String linkUrl) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/add'),
// //           headers: _headers, body: jsonEncode({'title': title, 'imageUrl': imageUrl, 'linkUrl': linkUrl}));
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> toggleBanner(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> toggleBannerCustomerHome(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle-customer-home'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> deleteBanner(int id) async {
// //     try {
// //       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/banners/$id'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   // ── Warehouse management ──────────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getWarehouses() async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> addWarehouse(
// //       String name, String city, String state, String servedPinCodes) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/add'),
// //           headers: _headers,
// //           body: jsonEncode({'name': name, 'city': city, 'state': state, 'servedPinCodes': servedPinCodes}));
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> toggleWarehouse(int id) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/toggle'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> getWarehouseBoys(int id) async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/boys'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   // ── Warehouse change requests ──────────────────────────────────────────────
// //   static Future<Map<String, dynamic>> getWarehouseChangeRequests() async {
// //     try {
// //       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests'), headers: _headers);
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> approveWarehouseChangeRequest(int id, {String adminNote = ''}) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/approve'),
// //           headers: _headers, body: jsonEncode({'adminNote': adminNote}));
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }

// //   static Future<Map<String, dynamic>> rejectWarehouseChangeRequest(int id, {String adminNote = ''}) async {
// //     try {
// //       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/reject'),
// //           headers: _headers, body: jsonEncode({'adminNote': adminNote}));
// //       return _safeParse(r);
// //     } catch (e) { return {'success': false, 'message': '$e'}; }
// //   }
// // }

// // // ─── DeliveryBoyService ───────────────────────────────────────────────────────

// // class DeliveryBoyService {
// //   // All delivery endpoints are now stateless Flutter JSON endpoints.
// //   // Auth is via X-Delivery-Boy-Id header — no web session needed.
// //   static Map<String, String> get _headers => {
// //         'Content-Type': 'application/json',
// //         'X-Delivery-Boy-Id': '${AuthService.currentUser?.id ?? 0}',
// //       };

// //   /// GET /api/flutter/delivery/home
// //   /// Returns: { success, profile, toPickUp, outNow, delivered }
// //   /// toPickUp   → SHIPPED orders   (Mark Picked Up)
// //   /// outNow     → OUT_FOR_DELIVERY (Confirm Delivery via OTP)
// //   /// delivered  → DELIVERED        (history)
// //   static Future<Map<String, dynamic>> getHome() async {
// //     try {
// //       final r = await http.get(
// //         Uri.parse(ApiConfig.deliveryHome),
// //         headers: _headers,
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   /// GET /api/flutter/delivery/warehouses
// //   static Future<List<Map<String, dynamic>>> getWarehouses() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.deliveryWarehouses),
// //           headers: _headers);
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['warehouses'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   /// POST /api/flutter/delivery/order/{id}/pickup
// //   /// Marks order as Out for Delivery, sends OTP email to customer.
// //   static Future<Map<String, dynamic>> markPickedUp(int orderId) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.deliveryPickup(orderId)),
// //         headers: _headers,
// //       );
// //       final d = _safeParse(r);
// //       // Surface HTTP status in message if backend returned an error
// //       if (d['success'] != true && d['message'] == null) {
// //         d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
// //       }
// //       return d;
// //     } catch (e) {
// //       return {'success': false, 'message': 'Connection error: $e'};
// //     }
// //   }

// //   /// POST /api/flutter/delivery/order/{id}/deliver
// //   /// Body: { otp: 123456 }
// //   /// Confirms delivery using OTP given by customer.
// //   static Future<Map<String, dynamic>> confirmDelivery(
// //       int orderId, int otp) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.deliveryDeliver(orderId)),
// //         headers: _headers,
// //         body: jsonEncode({'otp': otp}),
// //       );
// //       final d = _safeParse(r);
// //       if (d['success'] != true && d['message'] == null) {
// //         d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
// //       }
// //       return d;
// //     } catch (e) {
// //       return {'success': false, 'message': 'Connection error: $e'};
// //     }
// //   }

// //   /// POST /api/flutter/delivery/warehouse-change/request
// //   /// Body: { warehouseId: int, reason: string }
// //   static Future<Map<String, dynamic>> requestWarehouseChange(
// //       int warehouseId, String reason) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.deliveryWarehouseChangeRequest),
// //         headers: _headers,
// //         body: jsonEncode({'warehouseId': warehouseId, 'reason': reason}),
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }
// // }

// // // ─── BannerService ────────────────────────────────────────────────────────────

// // class BannerService {
// //   static Future<List<Map<String, dynamic>>> getBanners() async {
// //     try {
// //       final r = await http.get(Uri.parse(ApiConfig.banners));
// //       final d = _safeParse(r);
// //       if (d['success'] == true) {
// //         return List<Map<String, dynamic>>.from(d['banners'] ?? []);
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }
// // }

// // // ─── SearchService ────────────────────────────────────────────────────────────

// // class SearchService {
// //   static Future<List<String>> getSuggestions(String query) async {
// //     if (query.trim().isEmpty) return [];
// //     try {
// //       final uri = Uri.parse(ApiConfig.searchSuggestions)
// //           .replace(queryParameters: {'q': query.trim()});
// //       final r = await http.get(uri);
// //       if (r.statusCode == 200) {
// //         final body = r.body.trim();
// //         if (body.startsWith('[')) {
// //           final list = jsonDecode(body) as List;
// //           return list.map((e) {
// //             if (e is Map) {
// //               final name = e['productName'] ?? e['name'] ?? e['text'];
// //               return name?.toString() ?? '';
// //             }
// //             return e.toString();
// //           }).where((s) => s.isNotEmpty).toList();
// //         }
// //       }
// //       return [];
// //     } catch (_) {
// //       return [];
// //     }
// //   }

// //   static Future<String> getFuzzySuggestion(String query) async {
// //     if (query.trim().length < 2) return '';
// //     try {
// //       final uri = Uri.parse(ApiConfig.searchFuzzy)
// //           .replace(queryParameters: {'q': query.trim()});
// //       final r = await http.get(uri);
// //       final d = _safeParse(r);
// //       return (d['suggestion'] ?? '') as String;
// //     } catch (_) {
// //       return '';
// //     }
// //   }
// // }

// // // ─── NotifyMeService ─────────────────────────────────────────────────────────

// // class NotifyMeService {
// //   static Future<Map<String, dynamic>> subscribe(int productId) async {
// //     try {
// //       final r = await http.post(
// //         Uri.parse(ApiConfig.notifyMe(productId)),
// //         headers: _customerHeaders(),
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<Map<String, dynamic>> unsubscribe(int productId) async {
// //     try {
// //       final r = await http.delete(
// //         Uri.parse(ApiConfig.notifyMe(productId)),
// //         headers: _customerHeaders(),
// //       );
// //       return _safeParse(r);
// //     } catch (e) {
// //       return {'success': false, 'message': '$e'};
// //     }
// //   }

// //   static Future<bool> isSubscribed(int productId) async {
// //     try {
// //       final r = await http.get(
// //         Uri.parse(ApiConfig.notifyMeStatus(productId)),
// //         headers: _customerHeaders(),
// //       );
// //       final d = _safeParse(r);
// //       return d['subscribed'] == true;
// //     } catch (_) {
// //       return false;
// //     }
// //   }
// // }

// import 'dart:convert';
// import 'package:http/http.dart' as http;
// import '../config/api_config.dart';
// import '../models/product_model.dart';
// import '../models/order_model.dart';
// import 'auth_service.dart';

// // ─── helpers ────────────────────────────────────────────────────────────────

// Map<String, String> _customerHeaders() => {
//       'Content-Type': 'application/json',
//       'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
//     };

// Map<String, String> _vendorHeaders() => {
//       'Content-Type': 'application/json',
//       'X-Vendor-Id': '${AuthService.currentUser?.id ?? 0}',
//     };


// Map<String, dynamic> _safeParse(http.Response r) {
//   final body = r.body.trim();
//   // HTML response (Spring error page / redirect) — not JSON
//   if (body.startsWith('<') || body.isEmpty) {
//     return {'success': false, 'message': 'Server error (HTTP ${r.statusCode}). Check backend.'};
//   }
//   try {
//     final decoded = jsonDecode(body) as Map<String, dynamic>;
//     // If the backend returned a non-2xx status but with a JSON body,
//     // make sure 'success' is false so callers always get correct behaviour.
//     if (r.statusCode >= 400 && decoded['success'] == null) {
//       decoded['success'] = false;
//     }
//     return decoded;
//   } catch (e) {
//     return {'success': false, 'message': 'Invalid response (HTTP ${r.statusCode}): $e'};
//   }
// }

// // ─── ProductService ──────────────────────────────────────────────────────────

// class ProductService {
//   static Future<List<Product>> getProducts({
//     String? search,
//     String? category,
//     double? minPrice,
//     double? maxPrice,
//     String? sortBy,
//   }) async {
//     try {
//       final params = <String, String>{};
//       if (search != null && search.isNotEmpty) params['search'] = search;
//       if (category != null && category.isNotEmpty) params['category'] = category;
//       if (minPrice != null) params['minPrice'] = minPrice.toString();
//       if (maxPrice != null) params['maxPrice'] = maxPrice.toString();
//       if (sortBy != null && sortBy.isNotEmpty) params['sortBy'] = sortBy;
//       final uri = Uri.parse(ApiConfig.products).replace(queryParameters: params);
//       final r = await http.get(uri);
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return (d['products'] as List)
//             .map((e) => Product.fromJson(e as Map<String, dynamic>))
//             .toList();
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<List<String>> getCategories() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.categories));
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<String>.from(d['categories'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> getProductDetail(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.productById(id)));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── OrderService ────────────────────────────────────────────────────────────

// class OrderService {
//   static Future<List<Order>> getOrders() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.orders), headers: _customerHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return (d['orders'] as List)
//             .map((e) => Order.fromJson(e as Map<String, dynamic>))
//             .toList();
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> getOrderById(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.orderById(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> placeOrder({
//     required String paymentMode,
//     required String city,
//     required String deliveryTime,
//     String? couponCode,
//   }) async {
//     try {
//       final body = <String, dynamic>{
//         'paymentMode': paymentMode,
//         'city': city,
//         'deliveryTime': deliveryTime,
//       };
//       if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
//       final r = await http.post(Uri.parse(ApiConfig.placeOrder),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Place an order with a fully structured address
//   static Future<Map<String, dynamic>> placeOrderStructured({
//     required String paymentMode,
//     required String recipientName,
//     required String houseStreet,
//     required String city,
//     required String state,
//     required String postalCode,
//     required String deliveryTime,
//     String? couponCode,
//   }) async {
//     try {
//       final body = <String, dynamic>{
//         'paymentMode':   paymentMode,
//         'recipientName': recipientName,
//         'houseStreet':   houseStreet,
//         'city':          city,
//         'state':         state,
//         'postalCode':    postalCode,
//         'deliveryTime':  deliveryTime,
//       };
//       if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
//       final r = await http.post(Uri.parse(ApiConfig.placeOrder),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> cancelOrder(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.cancelOrder(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> reorder(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.reorder(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Pre-check stock levels before confirming a reorder.
//   /// Returns: { success, items: [ { productId, productName, requestedQty,
//   ///   availableStock, canAdd, status: 'OK'|'LOW'|'OUT_OF_STOCK' } ] }
//   static Future<Map<String, dynamic>> reorderStockCheck(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.reorderStockCheck(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> trackOrder(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.trackOrder(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> reportIssue(int id,
//       {required String reason, String? description}) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.reportIssue(id)),
//           headers: _customerHeaders(),
//           body: jsonEncode({'reason': reason, 'description': description ?? ''}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── CouponService ───────────────────────────────────────────────────────────

// class CouponService {
//   static Future<List<Map<String, dynamic>>> getActiveCoupons() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.activeCoupons));
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> applyCoupon(String code) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.cartCoupon),
//           headers: _customerHeaders(),
//           body: jsonEncode({'code': code}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> removeCoupon() async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.cartCoupon),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Legacy: validate coupon with amount (kept for checkout compatibility)
//   static Future<Map<String, dynamic>> validateCoupon(
//       String code, double orderAmount) async {
//     try {
//       final uri = Uri.parse(ApiConfig.validateCoupon).replace(queryParameters: {
//         'code': code,
//         'amount': orderAmount.toString(),
//       });
//       final r = await http.get(uri, headers: {'Content-Type': 'application/json'});
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── WishlistService ─────────────────────────────────────────────────────────

// class WishlistService {
//   static Future<Set<int>> getWishlistIds() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.wishlistIds),
//           headers: _customerHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return Set<int>.from((d['ids'] as List? ?? []).map((e) => e as int));
//       }
//       return {};
//     } catch (_) {
//       return {};
//     }
//   }

//   static Future<List<Map<String, dynamic>>> getWishlist() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.wishlist),
//           headers: _customerHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['items'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> toggle(int productId) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.wishlistToggle),
//           headers: _customerHeaders(),
//           body: jsonEncode({'productId': productId}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── ReviewService ───────────────────────────────────────────────────────────

// class ReviewService {
//   static Future<Map<String, dynamic>> getProductReviews(int productId) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.productReviews(productId)));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> addReview({
//     required int productId,
//     required int orderId,
//     required int rating,
//     required String comment,
//   }) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.addReview),
//           headers: _customerHeaders(),
//           body: jsonEncode({
//             'productId': productId,
//             'orderId':   orderId,
//             'rating':    rating,
//             'comment':   comment,
//           }));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Submit a review and then upload photos (up to 5) as a multipart follow-up.
//   /// Photos are posted to /api/flutter/reviews/{reviewId}/upload-images.
//   static Future<Map<String, dynamic>> addReviewWithPhotos({
//     required int    productId,
//     required int    orderId,
//     required int    rating,
//     required String comment,
//     required List<String> photoPaths, // local file paths
//   }) async {
//     // Step 1 — submit text review
//     Map<String, dynamic> reviewRes;
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.addReview),
//           headers: _customerHeaders(),
//           body: jsonEncode({
//             'productId': productId,
//             'orderId':   orderId,
//             'rating':    rating,
//             'comment':   comment,
//           }));
//       reviewRes = _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }

//     if (reviewRes['success'] != true || photoPaths.isEmpty) {
//       return reviewRes;
//     }

//     // Step 2 — upload photos to the returned reviewId
//     final reviewId = reviewRes['reviewId'] as int?;
//     if (reviewId == null) return reviewRes; // no id to attach photos to

//     try {
//       final uploadUrl =
//           '${ApiConfig.base}/reviews/$reviewId/upload-images';
//       final request = http.MultipartRequest('POST', Uri.parse(uploadUrl))
//         ..headers.addAll({
//           'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
//         });
//       for (final path in photoPaths.take(5)) {
//         request.files.add(await http.MultipartFile.fromPath('images', path));
//       }
//       final streamed = await request.send();
//       final resp     = await http.Response.fromStream(streamed);
//       final body     = resp.body.trim();
//       if (!body.startsWith('<') && body.isNotEmpty) {
//         final d = jsonDecode(body) as Map<String, dynamic>;
//         reviewRes['photosUploaded'] = d['uploaded'] ?? photoPaths.length;
//       }
//     } catch (_) {
//       // Photos upload failed, but the review itself succeeded
//       reviewRes['photosUploaded'] = 0;
//       reviewRes['photosError']    = 'Photo upload failed';
//     }

//     return reviewRes;
//   }
// }

// // ─── CartService ─────────────────────────────────────────────────────────────

// class CartService {
//   static Future<Map<String, dynamic>> getCart() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.cart), headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> addToCart(int productId, int qty) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.cartAdd),
//           headers: _customerHeaders(),
//           body: jsonEncode({'productId': productId, 'quantity': qty}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateCart(int productId, int qty) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.cartUpdate),
//           headers: _customerHeaders(),
//           body: jsonEncode({'productId': productId, 'quantity': qty}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> removeFromCart(int productId) async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.cartRemove(productId)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── ProfileService ───────────────────────────────────────────────────────────

// class ProfileService {
//   static Future<Map<String, dynamic>> getProfile() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.profile), headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.profileUpdate),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> addAddress(Map<String, String> body) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.addAddress),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> deleteAddress(int id) async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.deleteAddress(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> changePassword(
//       String current, String newPwd) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.changePassword),
//           headers: _customerHeaders(),
//           body: jsonEncode({'currentPassword': current, 'newPassword': newPwd}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── RefundService ───────────────────────────────────────────────────────────

// class RefundService {
//   static Future<Map<String, dynamic>> requestRefund({
//     required int orderId,
//     required String reason,
//   }) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.refundRequest),
//           headers: _customerHeaders(),
//           body: jsonEncode({'orderId': orderId, 'reason': reason}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getRefundStatus(int orderId) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.refundStatus(orderId)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Fetch all refund/replacement requests for the logged-in customer.
//   /// Returns: { success, refunds: [ { refundId, orderId, orderDate, type,
//   ///             reason, status, amount, adminNote } ] }
//   static Future<Map<String, dynamic>> getMyRefunds() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.myRefunds),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Fetch evidence image URLs for a specific refund.
//   /// Returns: { success, images: [ url1, url2, ... ] }
//   static Future<Map<String, dynamic>> getRefundImages(int refundId) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.refundImages(refundId)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── SpendingService ─────────────────────────────────────────────────────────

// class SpendingService {
//   static Future<Map<String, dynamic>> getSummary() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.spendingSummary),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── VendorService ───────────────────────────────────────────────────────────

// class VendorService {
//   static Future<Map<String, dynamic>> getStats() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorStats),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<List<Product>> getProducts() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorProducts),
//           headers: _vendorHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return (d['products'] as List)
//             .map((e) => Product.fromJson(e as Map<String, dynamic>))
//             .toList();
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<List<Map<String, dynamic>>> getOrders() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorOrders),
//           headers: _vendorHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['orders'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> addProduct(Map<String, dynamic> body) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.vendorAddProduct),
//           headers: _vendorHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateProduct(
//       int id, Map<String, dynamic> body) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.vendorUpdateProduct(id)),
//           headers: _vendorHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> deleteProduct(int id) async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.vendorDeleteProduct(id)),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getSalesReport({String period = 'weekly'}) async {
//     try {
//       final uri = Uri.parse(ApiConfig.vendorSalesReport)
//           .replace(queryParameters: {'period': period});
//       final r = await http.get(uri, headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getProfile() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorProfile),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.vendorProfileUpdate),
//           headers: _vendorHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getStockAlerts() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorStockAlerts),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> acknowledgeAlert(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.acknowledgeAlert(id)),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Mark an order item as ready for pickup
//   static Future<Map<String, dynamic>> markOrderReady(int orderId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.vendorMarkOrderReady(orderId)),
//         headers: _vendorHeaders(),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── AdminService ────────────────────────────────────────────────────────────

// class AdminService {
//   static Map<String, String> get _headers => {'Content-Type': 'application/json'};

//   static Future<Map<String, dynamic>> getUsers() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.adminUsers), headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getProducts() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.adminProducts), headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getOrders() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.adminOrders), headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> approveProduct(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminApproveProduct(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> rejectProduct(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminRejectProduct(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> approveAllProducts() async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminApproveAll),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> toggleCustomer(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminToggleCustomer(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> toggleVendor(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminToggleVendor(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateOrderStatus(int id, String status) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminOrderStatus(id)),
//           headers: _headers, body: jsonEncode({'status': status}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Coupon management ──────────────────────────────────────────────────────
//   static Future<List<Map<String, dynamic>>> getCoupons() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.adminCoupons),
//         headers: _headers,
//       );
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> createCoupon(Map<String, dynamic> body) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminCreateCoupon),
//         headers: _headers,
//         body: jsonEncode(body),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> toggleCoupon(int id) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminToggleCoupon(id)),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> deleteCoupon(int id) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminDeleteCoupon(id)),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Refund management ──────────────────────────────────────────────────────
//   static Future<List<Map<String, dynamic>>> getRefunds() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.adminRefunds),
//         headers: _headers,
//       );
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['refunds'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> processRefund(
//       int orderId, String action) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminProcessRefund(orderId)),
//         headers: _headers,
//         body: jsonEncode({'action': action}),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Delivery management ───────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getDeliveryData() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.adminDeliveryData),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> approveDeliveryBoy(
//       int deliveryBoyId, {String assignedPinCodes = ''}) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminApproveDelivery),
//         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
//         body: 'deliveryBoyId=$deliveryBoyId&assignedPinCodes=${Uri.encodeComponent(assignedPinCodes)}',
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> rejectDeliveryBoy(
//       int deliveryBoyId, {String reason = ''}) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminRejectDelivery),
//         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
//         body: 'deliveryBoyId=$deliveryBoyId&reason=${Uri.encodeComponent(reason)}',
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> assignDeliveryBoy(
//       int orderId, int deliveryBoyId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminAssignDelivery),
//         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
//         body: 'orderId=$orderId&deliveryBoyId=$deliveryBoyId',
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Platform stats ────────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getStats() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/stats'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Account management ────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getAccounts({String? search}) async {
//     try {
//       final uri = Uri.parse('${ApiConfig.base}/admin/accounts')
//           .replace(queryParameters: search != null && search.isNotEmpty ? {'search': search} : null);
//       final r = await http.get(uri, headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> getAccountStats() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/stats'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> getAccountProfile(int id) async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/$id/profile'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleAccount(int id, bool isActive) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/toggle'),
//           headers: _headers, body: jsonEncode({'isActive': isActive}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> resetAccountPassword(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/reset-password'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> deleteAccount(int id) async {
//     try {
//       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/accounts/$id'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Review management ─────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getReviews({String filter = 'all', String search = ''}) async {
//     try {
//       final uri = Uri.parse('${ApiConfig.base}/admin/reviews')
//           .replace(queryParameters: {'filter': filter, 'search': search});
//       final r = await http.get(uri, headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> deleteReview(int id) async {
//     try {
//       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/reviews/$id'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> bulkDeleteReviews(String productName) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/reviews/bulk-delete'),
//           headers: _headers, body: jsonEncode({'productName': productName}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Banner management ─────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getBanners() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/banners'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> addBanner(String title, String imageUrl, String linkUrl) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/add'),
//           headers: _headers, body: jsonEncode({'title': title, 'imageUrl': imageUrl, 'linkUrl': linkUrl}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleBanner(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleBannerCustomerHome(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle-customer-home'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> deleteBanner(int id) async {
//     try {
//       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/banners/$id'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Warehouse management ──────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getWarehouses() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> addWarehouse(
//       String name, String city, String state, String servedPinCodes) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/add'),
//           headers: _headers,
//           body: jsonEncode({'name': name, 'city': city, 'state': state, 'servedPinCodes': servedPinCodes}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleWarehouse(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/toggle'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> getWarehouseBoys(int id) async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/boys'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Warehouse change requests ──────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getWarehouseChangeRequests() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> approveWarehouseChangeRequest(int id, {String adminNote = ''}) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/approve'),
//           headers: _headers, body: jsonEncode({'adminNote': adminNote}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> rejectWarehouseChangeRequest(int id, {String adminNote = ''}) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/reject'),
//           headers: _headers, body: jsonEncode({'adminNote': adminNote}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }
// }

// // ─── DeliveryBoyService ───────────────────────────────────────────────────────

// class DeliveryBoyService {
//   // All delivery endpoints are now stateless Flutter JSON endpoints.
//   // Auth is via X-Delivery-Boy-Id header — no web session needed.
//   static Map<String, String> get _headers => {
//         'Content-Type': 'application/json',
//         'X-Delivery-Boy-Id': '${AuthService.currentUser?.id ?? 0}',
//       };

//   /// GET /api/flutter/delivery/home
//   /// Returns: { success, profile, toPickUp, outNow, delivered }
//   /// toPickUp   → SHIPPED orders   (Mark Picked Up)
//   /// outNow     → OUT_FOR_DELIVERY (Confirm Delivery via OTP)
//   /// delivered  → DELIVERED        (history)
//   static Future<Map<String, dynamic>> getHome() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.deliveryHome),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// GET /api/flutter/delivery/warehouses
//   static Future<List<Map<String, dynamic>>> getWarehouses() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.deliveryWarehouses),
//           headers: _headers);
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['warehouses'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/pickup
//   /// Marks order as Out for Delivery, sends OTP email to customer.
//   static Future<Map<String, dynamic>> markPickedUp(int orderId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryPickup(orderId)),
//         headers: _headers,
//       );
//       final d = _safeParse(r);
//       // Surface HTTP status in message if backend returned an error
//       if (d['success'] != true && d['message'] == null) {
//         d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/deliver
//   /// Body: { otp: 123456 }
//   /// Confirms delivery using OTP given by customer.
//   static Future<Map<String, dynamic>> confirmDelivery(
//       int orderId, int otp) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryDeliver(orderId)),
//         headers: _headers,
//         body: jsonEncode({'otp': otp}),
//       );
//       final d = _safeParse(r);
//       if (d['success'] != true && d['message'] == null) {
//         d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/warehouse-change/request
//   /// Body: { warehouseId: int, reason: string }
//   static Future<Map<String, dynamic>> requestWarehouseChange(
//       int warehouseId, String reason) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryWarehouseChangeRequest),
//         headers: _headers,
//         body: jsonEncode({'warehouseId': warehouseId, 'reason': reason}),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// POST /api/flutter/delivery/availability/toggle
//   /// Body: { isAvailable: bool }
//   /// Toggles the delivery boy's online/offline status.
//   static Future<Map<String, dynamic>> toggleAvailability(bool isAvailable) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryAvailabilityToggle),
//         headers: _headers,
//         body: jsonEncode({'isAvailable': isAvailable}),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/pickup
//   /// Body: { photo: base64string }
//   /// Marks order as Out for Delivery with a mandatory parcel photo.
//   static Future<Map<String, dynamic>> markPickedUpWithPhoto(
//       int orderId, String photoBase64) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryPickup(orderId)),
//         headers: _headers,
//         body: jsonEncode({'photo': photoBase64}),
//       );
//       final d = _safeParse(r);
//       if (d['success'] != true && d['message'] == null) {
//         d['message'] =
//             'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/deliver
//   /// Body: { otp: 123456, photo: base64string }
//   /// Confirms delivery with OTP + delivery proof photo.
//   static Future<Map<String, dynamic>> confirmDeliveryWithPhoto(
//       int orderId, int otp, String photoBase64) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryDeliver(orderId)),
//         headers: _headers,
//         body: jsonEncode({'otp': otp, 'photo': photoBase64}),
//       );
//       final d = _safeParse(r);
//       if (d['success'] != true && d['message'] == null) {
//         d['message'] =
//             'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/resend-otp
//   /// Asks the backend to re-send the delivery OTP email to the customer.
//   static Future<Map<String, dynamic>> resendOtp(int orderId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryResendOtp(orderId)),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/confirm
//   /// Body: { orderId, codStatus: 'COLLECTED'|'FAILED', amountCollected }
//   /// Records COD cash collection status after delivery.
//   static Future<Map<String, dynamic>> recordCodPayment({
//     required int orderId,
//     required String codStatus,
//     required double amountCollected,
//   }) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryCodConfirm),
//         headers: _headers,
//         body: jsonEncode({
//           'orderId': orderId,
//           'codStatus': codStatus,
//           'amountCollected': amountCollected,
//         }),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }
// }

// // ─── BannerService ────────────────────────────────────────────────────────────

// class BannerService {
//   static Future<List<Map<String, dynamic>>> getBanners() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.banners));
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['banners'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }
// }

// // ─── SearchService ────────────────────────────────────────────────────────────

// class SearchService {
//   static Future<List<String>> getSuggestions(String query) async {
//     if (query.trim().isEmpty) return [];
//     try {
//       final uri = Uri.parse(ApiConfig.searchSuggestions)
//           .replace(queryParameters: {'q': query.trim()});
//       final r = await http.get(uri);
//       if (r.statusCode == 200) {
//         final body = r.body.trim();
//         if (body.startsWith('[')) {
//           final list = jsonDecode(body) as List;
//           return list.map((e) {
//             if (e is Map) {
//               final name = e['productName'] ?? e['name'] ?? e['text'];
//               return name?.toString() ?? '';
//             }
//             return e.toString();
//           }).where((s) => s.isNotEmpty).toList();
//         }
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<String> getFuzzySuggestion(String query) async {
//     if (query.trim().length < 2) return '';
//     try {
//       final uri = Uri.parse(ApiConfig.searchFuzzy)
//           .replace(queryParameters: {'q': query.trim()});
//       final r = await http.get(uri);
//       final d = _safeParse(r);
//       return (d['suggestion'] ?? '') as String;
//     } catch (_) {
//       return '';
//     }
//   }
// }

// // ─── NotifyMeService ─────────────────────────────────────────────────────────

// class NotifyMeService {
//   static Future<Map<String, dynamic>> subscribe(int productId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.notifyMe(productId)),
//         headers: _customerHeaders(),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> unsubscribe(int productId) async {
//     try {
//       final r = await http.delete(
//         Uri.parse(ApiConfig.notifyMe(productId)),
//         headers: _customerHeaders(),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<bool> isSubscribed(int productId) async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.notifyMeStatus(productId)),
//         headers: _customerHeaders(),
//       );
//       final d = _safeParse(r);
//       return d['subscribed'] == true;
//     } catch (_) {
//       return false;
//     }
//   }
// }


// import 'dart:convert';
// import 'package:http/http.dart' as http;
// import '../config/api_config.dart';
// import '../models/product_model.dart';
// import '../models/order_model.dart';
// import 'auth_service.dart';

// // ─── helpers ────────────────────────────────────────────────────────────────

// Map<String, String> _customerHeaders() => {
//       'Content-Type': 'application/json',
//       'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
//     };

// Map<String, String> _vendorHeaders() => {
//       'Content-Type': 'application/json',
//       'X-Vendor-Id': '${AuthService.currentUser?.id ?? 0}',
//     };


// Map<String, dynamic> _safeParse(http.Response r) {
//   final body = r.body.trim();
//   // HTML response (Spring error page / redirect) — not JSON
//   if (body.startsWith('<') || body.isEmpty) {
//     return {'success': false, 'message': 'Server error (HTTP ${r.statusCode}). Check backend.'};
//   }
//   try {
//     final decoded = jsonDecode(body) as Map<String, dynamic>;
//     // If the backend returned a non-2xx status but with a JSON body,
//     // make sure 'success' is false so callers always get correct behaviour.
//     if (r.statusCode >= 400 && decoded['success'] == null) {
//       decoded['success'] = false;
//     }
//     return decoded;
//   } catch (e) {
//     return {'success': false, 'message': 'Invalid response (HTTP ${r.statusCode}): $e'};
//   }
// }

// // ─── ProductService ──────────────────────────────────────────────────────────

// class ProductService {
//   static Future<List<Product>> getProducts({
//     String? search,
//     String? category,
//     double? minPrice,
//     double? maxPrice,
//     String? sortBy,
//   }) async {
//     try {
//       final params = <String, String>{};
//       if (search != null && search.isNotEmpty) params['search'] = search;
//       if (category != null && category.isNotEmpty) params['category'] = category;
//       if (minPrice != null) params['minPrice'] = minPrice.toString();
//       if (maxPrice != null) params['maxPrice'] = maxPrice.toString();
//       if (sortBy != null && sortBy.isNotEmpty) params['sortBy'] = sortBy;
//       final uri = Uri.parse(ApiConfig.products).replace(queryParameters: params);
//       final r = await http.get(uri);
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return (d['products'] as List)
//             .map((e) => Product.fromJson(e as Map<String, dynamic>))
//             .toList();
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<List<String>> getCategories() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.categories));
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<String>.from(d['categories'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> getProductDetail(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.productById(id)));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── OrderService ────────────────────────────────────────────────────────────

// class OrderService {
//   static Future<List<Order>> getOrders() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.orders), headers: _customerHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return (d['orders'] as List)
//             .map((e) => Order.fromJson(e as Map<String, dynamic>))
//             .toList();
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> getOrderById(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.orderById(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> placeOrder({
//     required String paymentMode,
//     required String city,
//     required String deliveryTime,
//     String? couponCode,
//   }) async {
//     try {
//       final body = <String, dynamic>{
//         'paymentMode': paymentMode,
//         'city': city,
//         'deliveryTime': deliveryTime,
//       };
//       if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
//       final r = await http.post(Uri.parse(ApiConfig.placeOrder),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Place an order with a fully structured address
//   static Future<Map<String, dynamic>> placeOrderStructured({
//     required String paymentMode,
//     required String recipientName,
//     required String houseStreet,
//     required String city,
//     required String state,
//     required String postalCode,
//     required String deliveryTime,
//     String? couponCode,
//   }) async {
//     try {
//       final body = <String, dynamic>{
//         'paymentMode':   paymentMode,
//         'recipientName': recipientName,
//         'houseStreet':   houseStreet,
//         'city':          city,
//         'state':         state,
//         'postalCode':    postalCode,
//         'deliveryTime':  deliveryTime,
//       };
//       if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
//       final r = await http.post(Uri.parse(ApiConfig.placeOrder),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> cancelOrder(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.cancelOrder(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> reorder(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.reorder(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Pre-check stock levels before confirming a reorder.
//   /// Returns: { success, items: [ { productId, productName, requestedQty,
//   ///   availableStock, canAdd, status: 'OK'|'LOW'|'OUT_OF_STOCK' } ] }
//   static Future<Map<String, dynamic>> reorderStockCheck(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.reorderStockCheck(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> trackOrder(int id) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.trackOrder(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> reportIssue(int id,
//       {required String reason, String? description}) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.reportIssue(id)),
//           headers: _customerHeaders(),
//           body: jsonEncode({'reason': reason, 'description': description ?? ''}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── CouponService ───────────────────────────────────────────────────────────

// class CouponService {
//   static Future<List<Map<String, dynamic>>> getActiveCoupons() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.activeCoupons));
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> applyCoupon(String code) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.cartCoupon),
//           headers: _customerHeaders(),
//           body: jsonEncode({'code': code}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> removeCoupon() async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.cartCoupon),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Legacy: validate coupon with amount (kept for checkout compatibility)
//   static Future<Map<String, dynamic>> validateCoupon(
//       String code, double orderAmount) async {
//     try {
//       final uri = Uri.parse(ApiConfig.validateCoupon).replace(queryParameters: {
//         'code': code,
//         'amount': orderAmount.toString(),
//       });
//       final r = await http.get(uri, headers: {'Content-Type': 'application/json'});
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── WishlistService ─────────────────────────────────────────────────────────

// class WishlistService {
//   static Future<Set<int>> getWishlistIds() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.wishlistIds),
//           headers: _customerHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return Set<int>.from((d['ids'] as List? ?? []).map((e) => e as int));
//       }
//       return {};
//     } catch (_) {
//       return {};
//     }
//   }

//   static Future<List<Map<String, dynamic>>> getWishlist() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.wishlist),
//           headers: _customerHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['items'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> toggle(int productId) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.wishlistToggle),
//           headers: _customerHeaders(),
//           body: jsonEncode({'productId': productId}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── ReviewService ───────────────────────────────────────────────────────────

// class ReviewService {
//   static Future<Map<String, dynamic>> getProductReviews(int productId) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.productReviews(productId)));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> addReview({
//     required int productId,
//     required int orderId,
//     required int rating,
//     required String comment,
//   }) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.addReview),
//           headers: _customerHeaders(),
//           body: jsonEncode({
//             'productId': productId,
//             'orderId':   orderId,
//             'rating':    rating,
//             'comment':   comment,
//           }));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Submit a review and then upload photos (up to 5) as a multipart follow-up.
//   /// Photos are posted to /api/flutter/reviews/{reviewId}/upload-images.
//   static Future<Map<String, dynamic>> addReviewWithPhotos({
//     required int    productId,
//     required int    orderId,
//     required int    rating,
//     required String comment,
//     required List<String> photoPaths, // local file paths
//   }) async {
//     // Step 1 — submit text review
//     Map<String, dynamic> reviewRes;
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.addReview),
//           headers: _customerHeaders(),
//           body: jsonEncode({
//             'productId': productId,
//             'orderId':   orderId,
//             'rating':    rating,
//             'comment':   comment,
//           }));
//       reviewRes = _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }

//     if (reviewRes['success'] != true || photoPaths.isEmpty) {
//       return reviewRes;
//     }

//     // Step 2 — upload photos to the returned reviewId
//     final reviewId = reviewRes['reviewId'] as int?;
//     if (reviewId == null) return reviewRes; // no id to attach photos to

//     try {
//       final uploadUrl =
//           '${ApiConfig.base}/reviews/$reviewId/upload-images';
//       final request = http.MultipartRequest('POST', Uri.parse(uploadUrl))
//         ..headers.addAll({
//           'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
//         });
//       for (final path in photoPaths.take(5)) {
//         request.files.add(await http.MultipartFile.fromPath('images', path));
//       }
//       final streamed = await request.send();
//       final resp     = await http.Response.fromStream(streamed);
//       final body     = resp.body.trim();
//       if (!body.startsWith('<') && body.isNotEmpty) {
//         final d = jsonDecode(body) as Map<String, dynamic>;
//         reviewRes['photosUploaded'] = d['uploaded'] ?? photoPaths.length;
//       }
//     } catch (_) {
//       // Photos upload failed, but the review itself succeeded
//       reviewRes['photosUploaded'] = 0;
//       reviewRes['photosError']    = 'Photo upload failed';
//     }

//     return reviewRes;
//   }
// }

// // ─── CartService ─────────────────────────────────────────────────────────────

// class CartService {
//   static Future<Map<String, dynamic>> getCart() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.cart), headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> addToCart(int productId, int qty) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.cartAdd),
//           headers: _customerHeaders(),
//           body: jsonEncode({'productId': productId, 'quantity': qty}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateCart(int productId, int qty) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.cartUpdate),
//           headers: _customerHeaders(),
//           body: jsonEncode({'productId': productId, 'quantity': qty}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> removeFromCart(int productId) async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.cartRemove(productId)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── ProfileService ───────────────────────────────────────────────────────────

// class ProfileService {
//   static Future<Map<String, dynamic>> getProfile() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.profile), headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.profileUpdate),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> addAddress(Map<String, String> body) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.addAddress),
//           headers: _customerHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> deleteAddress(int id) async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.deleteAddress(id)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> changePassword(
//       String current, String newPwd) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.changePassword),
//           headers: _customerHeaders(),
//           body: jsonEncode({'currentPassword': current, 'newPassword': newPwd}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── RefundService ───────────────────────────────────────────────────────────

// class RefundService {
//   static Future<Map<String, dynamic>> requestRefund({
//     required int orderId,
//     required String reason,
//   }) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.refundRequest),
//           headers: _customerHeaders(),
//           body: jsonEncode({'orderId': orderId, 'reason': reason}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getRefundStatus(int orderId) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.refundStatus(orderId)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Fetch all refund/replacement requests for the logged-in customer.
//   /// Returns: { success, refunds: [ { refundId, orderId, orderDate, type,
//   ///             reason, status, amount, adminNote } ] }
//   static Future<Map<String, dynamic>> getMyRefunds() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.myRefunds),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Fetch evidence image URLs for a specific refund.
//   /// Returns: { success, images: [ url1, url2, ... ] }
//   static Future<Map<String, dynamic>> getRefundImages(int refundId) async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.refundImages(refundId)),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── SpendingService ─────────────────────────────────────────────────────────

// class SpendingService {
//   static Future<Map<String, dynamic>> getSummary() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.spendingSummary),
//           headers: _customerHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── VendorService ───────────────────────────────────────────────────────────

// class VendorService {
//   static Future<Map<String, dynamic>> getStats() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorStats),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<List<Product>> getProducts() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorProducts),
//           headers: _vendorHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return (d['products'] as List)
//             .map((e) => Product.fromJson(e as Map<String, dynamic>))
//             .toList();
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<List<Map<String, dynamic>>> getOrders() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorOrders),
//           headers: _vendorHeaders());
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['orders'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> addProduct(Map<String, dynamic> body) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.vendorAddProduct),
//           headers: _vendorHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateProduct(
//       int id, Map<String, dynamic> body) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.vendorUpdateProduct(id)),
//           headers: _vendorHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> deleteProduct(int id) async {
//     try {
//       final r = await http.delete(Uri.parse(ApiConfig.vendorDeleteProduct(id)),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getSalesReport({String period = 'weekly'}) async {
//     try {
//       final uri = Uri.parse(ApiConfig.vendorSalesReport)
//           .replace(queryParameters: {'period': period});
//       final r = await http.get(uri, headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getProfile() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorProfile),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
//     try {
//       final r = await http.put(Uri.parse(ApiConfig.vendorProfileUpdate),
//           headers: _vendorHeaders(), body: jsonEncode(body));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getStockAlerts() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.vendorStockAlerts),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> acknowledgeAlert(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.acknowledgeAlert(id)),
//           headers: _vendorHeaders());
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// Mark an order item as ready for pickup
//   static Future<Map<String, dynamic>> markOrderReady(int orderId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.vendorMarkOrderReady(orderId)),
//         headers: _vendorHeaders(),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── AdminService ────────────────────────────────────────────────────────────

// class AdminService {
//   static Map<String, String> get _headers => {'Content-Type': 'application/json'};

//   static Future<Map<String, dynamic>> getUsers() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.adminUsers), headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getProducts() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.adminProducts), headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> getOrders() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.adminOrders), headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> approveProduct(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminApproveProduct(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> rejectProduct(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminRejectProduct(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> approveAllProducts() async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminApproveAll),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> toggleCustomer(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminToggleCustomer(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> toggleVendor(int id) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminToggleVendor(id)),
//           headers: _headers);
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> updateOrderStatus(int id, String status) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminOrderStatus(id)),
//           headers: _headers, body: jsonEncode({'status': status}));
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Coupon management ──────────────────────────────────────────────────────
//   static Future<List<Map<String, dynamic>>> getCoupons() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.adminCoupons),
//         headers: _headers,
//       );
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> createCoupon(Map<String, dynamic> body) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminCreateCoupon),
//         headers: _headers,
//         body: jsonEncode(body),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> toggleCoupon(int id) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminToggleCoupon(id)),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> deleteCoupon(int id) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminDeleteCoupon(id)),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Refund management ──────────────────────────────────────────────────────
//   static Future<List<Map<String, dynamic>>> getRefunds() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.adminRefunds),
//         headers: _headers,
//       );
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['refunds'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<Map<String, dynamic>> processRefund(
//       int orderId, String action) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminProcessRefund(orderId)),
//         headers: _headers,
//         body: jsonEncode({'action': action}),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Delivery management ───────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getDeliveryData() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.adminDeliveryData),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> approveDeliveryBoy(
//       int deliveryBoyId, {String assignedPinCodes = ''}) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminApproveDelivery),
//         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
//         body: 'deliveryBoyId=$deliveryBoyId&assignedPinCodes=${Uri.encodeComponent(assignedPinCodes)}',
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> rejectDeliveryBoy(
//       int deliveryBoyId, {String reason = ''}) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminRejectDelivery),
//         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
//         body: 'deliveryBoyId=$deliveryBoyId&reason=${Uri.encodeComponent(reason)}',
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> assignDeliveryBoy(
//       int orderId, int deliveryBoyId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.adminAssignDelivery),
//         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
//         body: 'orderId=$orderId&deliveryBoyId=$deliveryBoyId',
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   // ── Platform stats ────────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getStats() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/stats'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Account management ────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getAccounts({String? search}) async {
//     try {
//       final uri = Uri.parse('${ApiConfig.base}/admin/accounts')
//           .replace(queryParameters: search != null && search.isNotEmpty ? {'search': search} : null);
//       final r = await http.get(uri, headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> getAccountStats() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/stats'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> getAccountProfile(int id) async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/$id/profile'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleAccount(int id, bool isActive) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/toggle'),
//           headers: _headers, body: jsonEncode({'isActive': isActive}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> resetAccountPassword(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/reset-password'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> deleteAccount(int id) async {
//     try {
//       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/accounts/$id'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Review management ─────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getReviews({String filter = 'all', String search = ''}) async {
//     try {
//       final uri = Uri.parse('${ApiConfig.base}/admin/reviews')
//           .replace(queryParameters: {'filter': filter, 'search': search});
//       final r = await http.get(uri, headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> deleteReview(int id) async {
//     try {
//       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/reviews/$id'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> bulkDeleteReviews(String productName) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/reviews/bulk-delete'),
//           headers: _headers, body: jsonEncode({'productName': productName}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Banner management ─────────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getBanners() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/banners'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> addBanner(String title, String imageUrl, String linkUrl) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/add'),
//           headers: _headers, body: jsonEncode({'title': title, 'imageUrl': imageUrl, 'linkUrl': linkUrl}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleBanner(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleBannerCustomerHome(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle-customer-home'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> deleteBanner(int id) async {
//     try {
//       final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/banners/$id'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Warehouse management ──────────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getWarehouses() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> addWarehouse(
//       String name, String city, String state, String servedPinCodes) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/add'),
//           headers: _headers,
//           body: jsonEncode({'name': name, 'city': city, 'state': state, 'servedPinCodes': servedPinCodes}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> toggleWarehouse(int id) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/toggle'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> getWarehouseBoys(int id) async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/boys'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   // ── Warehouse change requests ──────────────────────────────────────────────
//   static Future<Map<String, dynamic>> getWarehouseChangeRequests() async {
//     try {
//       final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests'), headers: _headers);
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> approveWarehouseChangeRequest(int id, {String adminNote = ''}) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/approve'),
//           headers: _headers, body: jsonEncode({'adminNote': adminNote}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }

//   static Future<Map<String, dynamic>> rejectWarehouseChangeRequest(int id, {String adminNote = ''}) async {
//     try {
//       final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/reject'),
//           headers: _headers, body: jsonEncode({'adminNote': adminNote}));
//       return _safeParse(r);
//     } catch (e) { return {'success': false, 'message': '$e'}; }
//   }
// }

// // ─── DeliveryBoyService ───────────────────────────────────────────────────────

// class DeliveryBoyService {
//   // All delivery endpoints are now stateless Flutter JSON endpoints.
//   // Auth is via X-Delivery-Boy-Id header — no web session needed.
//   static Map<String, String> get _headers => {
//         'Content-Type': 'application/json',
//         'X-Delivery-Boy-Id': '${AuthService.currentUser?.id ?? 0}',
//       };

//   /// GET /api/flutter/delivery/home
//   /// Returns: { success, profile, toPickUp, outNow, delivered }
//   /// toPickUp   → SHIPPED orders   (Mark Picked Up)
//   /// outNow     → OUT_FOR_DELIVERY (Confirm Delivery via OTP)
//   /// delivered  → DELIVERED        (history)
//   static Future<Map<String, dynamic>> getHome() async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.deliveryHome),
//         headers: _headers,
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   /// GET /api/flutter/delivery/warehouses
//   static Future<List<Map<String, dynamic>>> getWarehouses() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.deliveryWarehouses),
//           headers: _headers);
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['warehouses'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/pickup
//   /// Marks order as Out for Delivery, sends OTP email to customer.
//   static Future<Map<String, dynamic>> markPickedUp(int orderId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryPickup(orderId)),
//         headers: _headers,
//       );
//       final d = _safeParse(r);
//       // Surface HTTP status in message if backend returned an error
//       if (d['success'] != true && d['message'] == null) {
//         d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/order/{id}/deliver
//   /// Body: { otp: 123456 }
//   /// Confirms delivery using OTP given by customer.
//   static Future<Map<String, dynamic>> confirmDelivery(
//       int orderId, int otp) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryDeliver(orderId)),
//         headers: _headers,
//         body: jsonEncode({'otp': otp}),
//       );
//       final d = _safeParse(r);
//       if (d['success'] != true && d['message'] == null) {
//         d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// POST /api/flutter/delivery/warehouse-change/request
//   /// Body: { warehouseId: int, reason: string }
//   static Future<Map<String, dynamic>> requestWarehouseChange(
//       int warehouseId, String reason) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryWarehouseChangeRequest),
//         headers: _headers,
//         body: jsonEncode({'warehouseId': warehouseId, 'reason': reason}),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }
// }

// // ─── BannerService ────────────────────────────────────────────────────────────

// class BannerService {
//   static Future<List<Map<String, dynamic>>> getBanners() async {
//     try {
//       final r = await http.get(Uri.parse(ApiConfig.banners));
//       final d = _safeParse(r);
//       if (d['success'] == true) {
//         return List<Map<String, dynamic>>.from(d['banners'] ?? []);
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }
// }

// // ─── SearchService ────────────────────────────────────────────────────────────

// class SearchService {
//   static Future<List<String>> getSuggestions(String query) async {
//     if (query.trim().isEmpty) return [];
//     try {
//       final uri = Uri.parse(ApiConfig.searchSuggestions)
//           .replace(queryParameters: {'q': query.trim()});
//       final r = await http.get(uri);
//       if (r.statusCode == 200) {
//         final body = r.body.trim();
//         if (body.startsWith('[')) {
//           final list = jsonDecode(body) as List;
//           return list.map((e) {
//             if (e is Map) {
//               final name = e['productName'] ?? e['name'] ?? e['text'];
//               return name?.toString() ?? '';
//             }
//             return e.toString();
//           }).where((s) => s.isNotEmpty).toList();
//         }
//       }
//       return [];
//     } catch (_) {
//       return [];
//     }
//   }

//   static Future<String> getFuzzySuggestion(String query) async {
//     if (query.trim().length < 2) return '';
//     try {
//       final uri = Uri.parse(ApiConfig.searchFuzzy)
//           .replace(queryParameters: {'q': query.trim()});
//       final r = await http.get(uri);
//       final d = _safeParse(r);
//       return (d['suggestion'] ?? '') as String;
//     } catch (_) {
//       return '';
//     }
//   }
// }

// // ─── NotifyMeService ─────────────────────────────────────────────────────────

// class NotifyMeService {
//   static Future<Map<String, dynamic>> subscribe(int productId) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.notifyMe(productId)),
//         headers: _customerHeaders(),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<Map<String, dynamic>> unsubscribe(int productId) async {
//     try {
//       final r = await http.delete(
//         Uri.parse(ApiConfig.notifyMe(productId)),
//         headers: _customerHeaders(),
//       );
//       return _safeParse(r);
//     } catch (e) {
//       return {'success': false, 'message': '$e'};
//     }
//   }

//   static Future<bool> isSubscribed(int productId) async {
//     try {
//       final r = await http.get(
//         Uri.parse(ApiConfig.notifyMeStatus(productId)),
//         headers: _customerHeaders(),
//       );
//       final d = _safeParse(r);
//       return d['subscribed'] == true;
//     } catch (_) {
//       return false;
//     }
//   }
// }

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import 'auth_service.dart';

// ─── helpers ────────────────────────────────────────────────────────────────

Map<String, String> _customerHeaders() => {
      'Content-Type': 'application/json',
      'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
    };

Map<String, String> _vendorHeaders() => {
      'Content-Type': 'application/json',
      'X-Vendor-Id': '${AuthService.currentUser?.id ?? 0}',
    };


Map<String, dynamic> _safeParse(http.Response r) {
  final body = r.body.trim();
  // HTML response (Spring error page / redirect) — not JSON
  if (body.startsWith('<') || body.isEmpty) {
    return {'success': false, 'message': 'Server error (HTTP ${r.statusCode}). Check backend.'};
  }
  try {
    final decoded = jsonDecode(body) as Map<String, dynamic>;
    // If the backend returned a non-2xx status but with a JSON body,
    // make sure 'success' is false so callers always get correct behaviour.
    if (r.statusCode >= 400 && decoded['success'] == null) {
      decoded['success'] = false;
    }
    return decoded;
  } catch (e) {
    return {'success': false, 'message': 'Invalid response (HTTP ${r.statusCode}): $e'};
  }
}

// ─── ProductService ──────────────────────────────────────────────────────────

class ProductService {
  static Future<List<Product>> getProducts({
    String? search,
    String? category,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
  }) async {
    try {
      final params = <String, String>{};
      if (search != null && search.isNotEmpty) params['search'] = search;
      if (category != null && category.isNotEmpty) params['category'] = category;
      if (minPrice != null) params['minPrice'] = minPrice.toString();
      if (maxPrice != null) params['maxPrice'] = maxPrice.toString();
      if (sortBy != null && sortBy.isNotEmpty) params['sortBy'] = sortBy;
      final uri = Uri.parse(ApiConfig.products).replace(queryParameters: params);
      final r = await http.get(uri);
      final d = _safeParse(r);
      if (d['success'] == true) {
        return (d['products'] as List)
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<List<String>> getCategories() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.categories));
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<String>.from(d['categories'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> getProductDetail(int id) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.productById(id)));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── OrderService ────────────────────────────────────────────────────────────

class OrderService {
  static Future<List<Order>> getOrders() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.orders), headers: _customerHeaders());
      final d = _safeParse(r);
      if (d['success'] == true) {
        return (d['orders'] as List)
            .map((e) => Order.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> getOrderById(int id) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.orderById(id)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> placeOrder({
    required String paymentMode,
    required String city,
    required String deliveryTime,
    String? couponCode,
  }) async {
    try {
      final body = <String, dynamic>{
        'paymentMode': paymentMode,
        'city': city,
        'deliveryTime': deliveryTime,
      };
      if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
      final r = await http.post(Uri.parse(ApiConfig.placeOrder),
          headers: _customerHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Place an order with a fully structured address
  static Future<Map<String, dynamic>> placeOrderStructured({
    required String paymentMode,
    required String recipientName,
    required String houseStreet,
    required String city,
    required String state,
    required String postalCode,
    required String deliveryTime,
    String? couponCode,
  }) async {
    try {
      final body = <String, dynamic>{
        'paymentMode':   paymentMode,
        'recipientName': recipientName,
        'houseStreet':   houseStreet,
        'city':          city,
        'state':         state,
        'postalCode':    postalCode,
        'deliveryTime':  deliveryTime,
      };
      if (couponCode != null && couponCode.isNotEmpty) body['couponCode'] = couponCode;
      final r = await http.post(Uri.parse(ApiConfig.placeOrder),
          headers: _customerHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> cancelOrder(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.cancelOrder(id)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> reorder(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.reorder(id)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Pre-check stock levels before confirming a reorder.
  /// Returns: { success, items: [ { productId, productName, requestedQty,
  ///   availableStock, canAdd, status: 'OK'|'LOW'|'OUT_OF_STOCK' } ] }
  static Future<Map<String, dynamic>> reorderStockCheck(int id) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.reorderStockCheck(id)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> trackOrder(int id) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.trackOrder(id)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> reportIssue(int id,
      {required String reason, String? description}) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.reportIssue(id)),
          headers: _customerHeaders(),
          body: jsonEncode({'reason': reason, 'description': description ?? ''}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── CouponService ───────────────────────────────────────────────────────────

class CouponService {
  static Future<List<Map<String, dynamic>>> getActiveCoupons() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.activeCoupons));
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> applyCoupon(String code) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.cartCoupon),
          headers: _customerHeaders(),
          body: jsonEncode({'code': code}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> removeCoupon() async {
    try {
      final r = await http.delete(Uri.parse(ApiConfig.cartCoupon),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Legacy: validate coupon with amount (kept for checkout compatibility)
  static Future<Map<String, dynamic>> validateCoupon(
      String code, double orderAmount) async {
    try {
      final uri = Uri.parse(ApiConfig.validateCoupon).replace(queryParameters: {
        'code': code,
        'amount': orderAmount.toString(),
      });
      final r = await http.get(uri, headers: {'Content-Type': 'application/json'});
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── WishlistService ─────────────────────────────────────────────────────────

class WishlistService {
  static Future<Set<int>> getWishlistIds() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.wishlistIds),
          headers: _customerHeaders());
      final d = _safeParse(r);
      if (d['success'] == true) {
        return Set<int>.from((d['ids'] as List? ?? []).map((e) => e as int));
      }
      return {};
    } catch (_) {
      return {};
    }
  }

  static Future<List<Map<String, dynamic>>> getWishlist() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.wishlist),
          headers: _customerHeaders());
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['items'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> toggle(int productId) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.wishlistToggle),
          headers: _customerHeaders(),
          body: jsonEncode({'productId': productId}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── ReviewService ───────────────────────────────────────────────────────────

class ReviewService {
  static Future<Map<String, dynamic>> getProductReviews(int productId) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.productReviews(productId)));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> addReview({
    required int productId,
    required int orderId,
    required int rating,
    required String comment,
  }) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.addReview),
          headers: _customerHeaders(),
          body: jsonEncode({
            'productId': productId,
            'orderId':   orderId,
            'rating':    rating,
            'comment':   comment,
          }));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Submit a review and then upload photos (up to 5) as a multipart follow-up.
  /// Photos are posted to /api/flutter/reviews/{reviewId}/upload-images.
  static Future<Map<String, dynamic>> addReviewWithPhotos({
    required int    productId,
    required int    orderId,
    required int    rating,
    required String comment,
    required List<String> photoPaths, // local file paths
  }) async {
    // Step 1 — submit text review
    Map<String, dynamic> reviewRes;
    try {
      final r = await http.post(Uri.parse(ApiConfig.addReview),
          headers: _customerHeaders(),
          body: jsonEncode({
            'productId': productId,
            'orderId':   orderId,
            'rating':    rating,
            'comment':   comment,
          }));
      reviewRes = _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }

    if (reviewRes['success'] != true || photoPaths.isEmpty) {
      return reviewRes;
    }

    // Step 2 — upload photos to the returned reviewId
    final reviewId = reviewRes['reviewId'] as int?;
    if (reviewId == null) return reviewRes; // no id to attach photos to

    try {
      final uploadUrl =
          '${ApiConfig.base}/reviews/$reviewId/upload-images';
      final request = http.MultipartRequest('POST', Uri.parse(uploadUrl))
        ..headers.addAll({
          'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
        });
      for (final path in photoPaths.take(5)) {
        request.files.add(await http.MultipartFile.fromPath('images', path));
      }
      final streamed = await request.send();
      final resp     = await http.Response.fromStream(streamed);
      final body     = resp.body.trim();
      if (!body.startsWith('<') && body.isNotEmpty) {
        final d = jsonDecode(body) as Map<String, dynamic>;
        reviewRes['photosUploaded'] = d['uploaded'] ?? photoPaths.length;
      }
    } catch (_) {
      // Photos upload failed, but the review itself succeeded
      reviewRes['photosUploaded'] = 0;
      reviewRes['photosError']    = 'Photo upload failed';
    }

    return reviewRes;
  }
}

// ─── CartService ─────────────────────────────────────────────────────────────

class CartService {
  static Future<Map<String, dynamic>> getCart() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.cart), headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> addToCart(int productId, int qty) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.cartAdd),
          headers: _customerHeaders(),
          body: jsonEncode({'productId': productId, 'quantity': qty}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> updateCart(int productId, int qty) async {
    try {
      final r = await http.put(Uri.parse(ApiConfig.cartUpdate),
          headers: _customerHeaders(),
          body: jsonEncode({'productId': productId, 'quantity': qty}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> removeFromCart(int productId) async {
    try {
      final r = await http.delete(Uri.parse(ApiConfig.cartRemove(productId)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── ProfileService ───────────────────────────────────────────────────────────

class ProfileService {
  static Future<Map<String, dynamic>> getProfile() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.profile), headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    try {
      final r = await http.put(Uri.parse(ApiConfig.profileUpdate),
          headers: _customerHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> addAddress(Map<String, String> body) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.addAddress),
          headers: _customerHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> deleteAddress(int id) async {
    try {
      final r = await http.delete(Uri.parse(ApiConfig.deleteAddress(id)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> changePassword(
      String current, String newPwd) async {
    try {
      final r = await http.put(Uri.parse(ApiConfig.changePassword),
          headers: _customerHeaders(),
          body: jsonEncode({'currentPassword': current, 'newPassword': newPwd}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── RefundService ───────────────────────────────────────────────────────────

class RefundService {
  static Future<Map<String, dynamic>> requestRefund({
    required int orderId,
    required String reason,
  }) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.refundRequest),
          headers: _customerHeaders(),
          body: jsonEncode({'orderId': orderId, 'reason': reason}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> getRefundStatus(int orderId) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.refundStatus(orderId)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Fetch all refund/replacement requests for the logged-in customer.
  /// Returns: { success, refunds: [ { refundId, orderId, orderDate, type,
  ///             reason, status, amount, adminNote } ] }
  static Future<Map<String, dynamic>> getMyRefunds() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.myRefunds),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Fetch evidence image URLs for a specific refund.
  /// Returns: { success, images: [ url1, url2, ... ] }
  static Future<Map<String, dynamic>> getRefundImages(int refundId) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.refundImages(refundId)),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── SpendingService ─────────────────────────────────────────────────────────

class SpendingService {
  static Future<Map<String, dynamic>> getSummary() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.spendingSummary),
          headers: _customerHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── VendorService ───────────────────────────────────────────────────────────

class VendorService {
  static Future<Map<String, dynamic>> getStats() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.vendorStats),
          headers: _vendorHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<List<Product>> getProducts() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.vendorProducts),
          headers: _vendorHeaders());
      final d = _safeParse(r);
      if (d['success'] == true) {
        return (d['products'] as List)
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<List<Map<String, dynamic>>> getOrders() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.vendorOrders),
          headers: _vendorHeaders());
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['orders'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> addProduct(Map<String, dynamic> body) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.vendorAddProduct),
          headers: _vendorHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> updateProduct(
      int id, Map<String, dynamic> body) async {
    try {
      final r = await http.put(Uri.parse(ApiConfig.vendorUpdateProduct(id)),
          headers: _vendorHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> deleteProduct(int id) async {
    try {
      final r = await http.delete(Uri.parse(ApiConfig.vendorDeleteProduct(id)),
          headers: _vendorHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> getSalesReport({String period = 'weekly'}) async {
    try {
      final uri = Uri.parse(ApiConfig.vendorSalesReport)
          .replace(queryParameters: {'period': period});
      final r = await http.get(uri, headers: _vendorHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> getProfile() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.vendorProfile),
          headers: _vendorHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    try {
      final r = await http.put(Uri.parse(ApiConfig.vendorProfileUpdate),
          headers: _vendorHeaders(), body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> getStockAlerts() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.vendorStockAlerts),
          headers: _vendorHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> acknowledgeAlert(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.acknowledgeAlert(id)),
          headers: _vendorHeaders());
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Mark an order item as ready for pickup
  static Future<Map<String, dynamic>> markOrderReady(int orderId) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.vendorMarkOrderReady(orderId)),
        headers: _vendorHeaders(),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}

// ─── AdminService ────────────────────────────────────────────────────────────

class AdminService {
  static Map<String, String> get _headers => {'Content-Type': 'application/json'};

  static Future<Map<String, dynamic>> getUsers() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminUsers), headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> getProducts() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminProducts), headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> getOrders() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminOrders), headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> approveProduct(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminApproveProduct(id)),
          headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> rejectProduct(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminRejectProduct(id)),
          headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> approveAllProducts() async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminApproveAll),
        headers: _headers,
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> toggleCustomer(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminToggleCustomer(id)),
          headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> toggleVendor(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminToggleVendor(id)),
          headers: _headers);
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> updateOrderStatus(int id, String status) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminOrderStatus(id)),
          headers: _headers, body: jsonEncode({'status': status}));
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  // ── Coupon management ──────────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getCoupons() async {
    try {
      final r = await http.get(
        Uri.parse(ApiConfig.adminCoupons),
        headers: _headers,
      );
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['coupons'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> createCoupon(Map<String, dynamic> body) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminCreateCoupon),
        headers: _headers,
        body: jsonEncode(body),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> toggleCoupon(int id) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminToggleCoupon(id)),
        headers: _headers,
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> deleteCoupon(int id) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminDeleteCoupon(id)),
        headers: _headers,
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  // ── Refund management ──────────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getRefunds() async {
    try {
      final r = await http.get(
        Uri.parse(ApiConfig.adminRefunds),
        headers: _headers,
      );
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['refunds'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> processRefund(
      int orderId, String action) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminProcessRefund(orderId)),
        headers: _headers,
        body: jsonEncode({'action': action}),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  // ── Delivery management ───────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDeliveryData() async {
    try {
      final r = await http.get(
        Uri.parse(ApiConfig.adminDeliveryData),
        headers: _headers,
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> approveDeliveryBoy(
      int deliveryBoyId, {String assignedPinCodes = ''}) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminApproveDelivery),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'deliveryBoyId=$deliveryBoyId&assignedPinCodes=${Uri.encodeComponent(assignedPinCodes)}',
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> rejectDeliveryBoy(
      int deliveryBoyId, {String reason = ''}) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminRejectDelivery),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'deliveryBoyId=$deliveryBoyId&reason=${Uri.encodeComponent(reason)}',
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> assignDeliveryBoy(
      int orderId, int deliveryBoyId) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.adminAssignDelivery),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'orderId=$orderId&deliveryBoyId=$deliveryBoyId',
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  // ── Platform stats ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getStats() async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/stats'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Account management ────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getAccounts({String? search}) async {
    try {
      final uri = Uri.parse('${ApiConfig.base}/admin/accounts')
          .replace(queryParameters: search != null && search.isNotEmpty ? {'search': search} : null);
      final r = await http.get(uri, headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> getAccountStats() async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/stats'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> getAccountProfile(int id) async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/accounts/$id/profile'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> toggleAccount(int id, bool isActive) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/toggle'),
          headers: _headers, body: jsonEncode({'isActive': isActive}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> resetAccountPassword(int id) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/accounts/$id/reset-password'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> deleteAccount(int id) async {
    try {
      final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/accounts/$id'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Review management ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getReviews({String filter = 'all', String search = ''}) async {
    try {
      final uri = Uri.parse('${ApiConfig.base}/admin/reviews')
          .replace(queryParameters: {'filter': filter, 'search': search});
      final r = await http.get(uri, headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> deleteReview(int id) async {
    try {
      final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/reviews/$id'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> bulkDeleteReviews(String productName) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/reviews/bulk-delete'),
          headers: _headers, body: jsonEncode({'productName': productName}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Banner management ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getBanners() async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/banners'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> addBanner(String title, String imageUrl, String linkUrl) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/add'),
          headers: _headers, body: jsonEncode({'title': title, 'imageUrl': imageUrl, 'linkUrl': linkUrl}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> toggleBanner(int id) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> toggleBannerCustomerHome(int id) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/banners/$id/toggle-customer-home'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> deleteBanner(int id) async {
    try {
      final r = await http.delete(Uri.parse('${ApiConfig.base}/admin/banners/$id'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Warehouse management ──────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getWarehouses() async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> addWarehouse(
      String name, String city, String state, String servedPinCodes) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/add'),
          headers: _headers,
          body: jsonEncode({'name': name, 'city': city, 'state': state, 'servedPinCodes': servedPinCodes}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> toggleWarehouse(int id) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/toggle'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> getWarehouseBoys(int id) async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouses/$id/boys'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Warehouse change requests ──────────────────────────────────────────────
  static Future<Map<String, dynamic>> getWarehouseChangeRequests() async {
    try {
      final r = await http.get(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests'), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> approveWarehouseChangeRequest(int id, {String adminNote = ''}) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/approve'),
          headers: _headers, body: jsonEncode({'adminNote': adminNote}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> rejectWarehouseChangeRequest(int id, {String adminNote = ''}) async {
    try {
      final r = await http.post(Uri.parse('${ApiConfig.base}/admin/warehouse-change-requests/$id/reject'),
          headers: _headers, body: jsonEncode({'adminNote': adminNote}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Settlement ──────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getSettlements(String month) async {
    try {
      final r = await http.get(
          Uri.parse('${ApiConfig.base}/admin/settlements?month=$month'),
          headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> processSettlement(String month) async {
    try {
      final r = await http.post(
          Uri.parse('${ApiConfig.base}/admin/settlements/process?month=$month'),
          headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getCategories() async {
    try {
      final r = await http.get(
          Uri.parse(ApiConfig.adminCategories), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> addParentCategory(
      String name, String emoji, int displayOrder) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminCategoriesParent),
          headers: _headers,
          body: jsonEncode({'name': name, 'emoji': emoji, 'displayOrder': displayOrder}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> addSubCategory(
      int parentId, String name, String emoji, int displayOrder) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminCategoriesSub),
          headers: _headers,
          body: jsonEncode({'parentId': parentId, 'name': name, 'emoji': emoji, 'displayOrder': displayOrder}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> updateCategory(
      int id, String name, String emoji, int displayOrder) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminCategoryUpdate(id)),
          headers: _headers,
          body: jsonEncode({'name': name, 'emoji': emoji, 'displayOrder': displayOrder}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> deleteCategory(int id) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminCategoryDelete(id)),
          headers: _headers, body: jsonEncode({}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Policies ────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getPolicies() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminPolicies), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> createPolicy(Map<String, dynamic> body) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminPolicies),
          headers: _headers, body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> updatePolicy(
      String slug, Map<String, dynamic> body) async {
    try {
      final r = await http.put(Uri.parse(ApiConfig.adminPolicyBySlug(slug)),
          headers: _headers, body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> deletePolicy(String slug) async {
    try {
      final r = await http.delete(Uri.parse(ApiConfig.adminPolicyBySlug(slug)),
          headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Order detail + cancel ───────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getOrderDetail(int id) async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminOrderDetail(id)), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> cancelOrder(int id, {String reason = 'Admin-initiated cancellation'}) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminOrderCancel(id)),
          headers: _headers, body: jsonEncode({'reason': reason}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Delivery load board ─────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getDeliveryBoysLoad() async {
    try {
      final r = await http.get(
          Uri.parse(ApiConfig.adminDeliveryBoysLoad), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> updateDeliveryBoyPins(
      int boyId, String pins) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminDeliveryBoyPins(boyId)),
          headers: _headers, body: jsonEncode({'assignedPinCodes': pins}));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Admin COD delivery confirmation ────────────────────────────────────────

  static Future<Map<String, dynamic>> confirmDeliveryAdmin({
    required int orderId,
    required String codStatus,
    double? amountCollected,
  }) async {
    try {
      final body = <String, dynamic>{
        'orderId': orderId,
        'codStatus': codStatus,
      };
      if (amountCollected != null) body['amountCollected'] = amountCollected;
      final r = await http.post(Uri.parse(ApiConfig.adminDeliveryConfirm),
          headers: _headers, body: jsonEncode(body));
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  // ── Packed / Shipped / Out-for-delivery order lists ─────────────────────────

  static Future<Map<String, dynamic>> getPackedOrders() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminOrdersPacked), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> getShippedOrders() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.adminOrdersShipped), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }

  static Future<Map<String, dynamic>> getOutForDeliveryOrders() async {
    try {
      final r = await http.get(
          Uri.parse(ApiConfig.adminOrdersOutForDelivery), headers: _headers);
      return _safeParse(r);
    } catch (e) { return {'success': false, 'message': '$e'}; }
  }
}

// ─── DeliveryBoyService ───────────────────────────────────────────────────────

class DeliveryBoyService {
  // All delivery endpoints are now stateless Flutter JSON endpoints.
  // Auth is via X-Delivery-Boy-Id header — no web session needed.
  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'X-Delivery-Boy-Id': '${AuthService.currentUser?.id ?? 0}',
      };

  /// GET /api/flutter/delivery/home
  /// Returns: { success, profile, toPickUp, outNow, delivered }
  /// toPickUp   → SHIPPED orders   (Mark Picked Up)
  /// outNow     → OUT_FOR_DELIVERY (Confirm Delivery via OTP)
  /// delivered  → DELIVERED        (history)
  static Future<Map<String, dynamic>> getHome() async {
    try {
      final r = await http.get(
        Uri.parse(ApiConfig.deliveryHome),
        headers: _headers,
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// GET /api/flutter/delivery/warehouses
  static Future<List<Map<String, dynamic>>> getWarehouses() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.deliveryWarehouses),
          headers: _headers);
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['warehouses'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// POST /api/flutter/delivery/order/{id}/pickup
  /// Marks order as Out for Delivery, sends OTP email to customer.
  static Future<Map<String, dynamic>> markPickedUp(int orderId) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryPickup(orderId)),
        headers: _headers,
      );
      final d = _safeParse(r);
      // Surface HTTP status in message if backend returned an error
      if (d['success'] != true && d['message'] == null) {
        d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// POST /api/flutter/delivery/order/{id}/deliver
  /// Body: { otp: 123456 }
  /// Confirms delivery using OTP given by customer.
  static Future<Map<String, dynamic>> confirmDelivery(
      int orderId, int otp) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryDeliver(orderId)),
        headers: _headers,
        body: jsonEncode({'otp': otp}),
      );
      final d = _safeParse(r);
      if (d['success'] != true && d['message'] == null) {
        d['message'] = 'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// POST /api/flutter/delivery/warehouse-change/request
  /// Body: { warehouseId: int, reason: string }
  static Future<Map<String, dynamic>> requestWarehouseChange(
      int warehouseId, String reason) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryWarehouseChangeRequest),
        headers: _headers,
        body: jsonEncode({'warehouseId': warehouseId, 'reason': reason}),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// POST /api/flutter/delivery/availability/toggle
  /// Body: { isAvailable: bool }
  /// Toggles the delivery boy's online/offline status.
  static Future<Map<String, dynamic>> toggleAvailability(bool isAvailable) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryAvailabilityToggle),
        headers: _headers,
        body: jsonEncode({'isAvailable': isAvailable}),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// POST /api/flutter/delivery/order/{id}/pickup
  /// Body: { photo: base64string }
  /// Marks order as Out for Delivery with a mandatory parcel photo.
  static Future<Map<String, dynamic>> markPickedUpWithPhoto(
      int orderId, String photoBase64) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryPickup(orderId)),
        headers: _headers,
        body: jsonEncode({'photo': photoBase64}),
      );
      final d = _safeParse(r);
      if (d['success'] != true && d['message'] == null) {
        d['message'] =
            'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// POST /api/flutter/delivery/order/{id}/deliver
  /// Body: { otp: 123456, photo: base64string }
  /// Confirms delivery with OTP + delivery proof photo.
  static Future<Map<String, dynamic>> confirmDeliveryWithPhoto(
      int orderId, int otp, String photoBase64) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryDeliver(orderId)),
        headers: _headers,
        body: jsonEncode({'otp': otp, 'photo': photoBase64}),
      );
      final d = _safeParse(r);
      if (d['success'] != true && d['message'] == null) {
        d['message'] =
            'HTTP ${r.statusCode}: ${r.body.substring(0, r.body.length.clamp(0, 200))}';
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// POST /api/flutter/delivery/order/{id}/resend-otp
  /// Asks the backend to re-send the delivery OTP email to the customer.
  static Future<Map<String, dynamic>> resendOtp(int orderId) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryResendOtp(orderId)),
        headers: _headers,
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// POST /api/flutter/delivery/confirm
  /// Body: { orderId, codStatus: 'COLLECTED'|'FAILED', amountCollected }
  /// Records COD cash collection status after delivery.
  static Future<Map<String, dynamic>> recordCodPayment({
    required int orderId,
    required String codStatus,
    required double amountCollected,
  }) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryCodConfirm),
        headers: _headers,
        body: jsonEncode({
          'orderId': orderId,
          'codStatus': codStatus,
          'amountCollected': amountCollected,
        }),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }
}

// ─── BannerService ────────────────────────────────────────────────────────────

class BannerService {
  static Future<List<Map<String, dynamic>>> getBanners() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.banners));
      final d = _safeParse(r);
      if (d['success'] == true) {
        return List<Map<String, dynamic>>.from(d['banners'] ?? []);
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}

// ─── SearchService ────────────────────────────────────────────────────────────

class SearchService {
  static Future<List<String>> getSuggestions(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final uri = Uri.parse(ApiConfig.searchSuggestions)
          .replace(queryParameters: {'q': query.trim()});
      final r = await http.get(uri);
      if (r.statusCode == 200) {
        final body = r.body.trim();
        if (body.startsWith('[')) {
          final list = jsonDecode(body) as List;
          return list.map((e) {
            if (e is Map) {
              final name = e['productName'] ?? e['name'] ?? e['text'];
              return name?.toString() ?? '';
            }
            return e.toString();
          }).where((s) => s.isNotEmpty).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<String> getFuzzySuggestion(String query) async {
    if (query.trim().length < 2) return '';
    try {
      final uri = Uri.parse(ApiConfig.searchFuzzy)
          .replace(queryParameters: {'q': query.trim()});
      final r = await http.get(uri);
      final d = _safeParse(r);
      return (d['suggestion'] ?? '') as String;
    } catch (_) {
      return '';
    }
  }
}

// ─── NotifyMeService ─────────────────────────────────────────────────────────

class NotifyMeService {
  static Future<Map<String, dynamic>> subscribe(int productId) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.notifyMe(productId)),
        headers: _customerHeaders(),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<Map<String, dynamic>> unsubscribe(int productId) async {
    try {
      final r = await http.delete(
        Uri.parse(ApiConfig.notifyMe(productId)),
        headers: _customerHeaders(),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  static Future<bool> isSubscribed(int productId) async {
    try {
      final r = await http.get(
        Uri.parse(ApiConfig.notifyMeStatus(productId)),
        headers: _customerHeaders(),
      );
      final d = _safeParse(r);
      return d['subscribed'] == true;
    } catch (_) {
      return false;
    }
  }
}