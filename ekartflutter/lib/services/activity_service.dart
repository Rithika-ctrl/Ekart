import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

/// Silently tracks customer actions (page views, searches, cart adds, etc.)
/// and batch-flushes them to the backend — mirroring the website's
/// user-action-logger.js.
///
/// Usage:
///   ActivityService.log('PAGE_VIEW', {'page': 'product_detail', 'productId': 42});
///   ActivityService.log('CART_ADD', {'productId': 42, 'productName': 'Widget'});
class ActivityService {
  static const Duration _flushInterval = Duration(seconds: 30);
  static const int      _maxBufferSize = 50;

  static final List<Map<String, dynamic>> _buffer = [];
  static Timer? _flushTimer;

  // ── Public API ──────────────────────────────────────────────────────────────

  static void log(String actionType, [Map<String, dynamic>? metadata]) {
    final uid = AuthService.currentUser?.id;
    if (uid == null) return; // not logged in — don't track

    _buffer.add({
      'userId':     uid,
      'actionType': actionType,
      'metadata':   jsonEncode(metadata ?? {}),
      'timestamp':  DateTime.now().toUtc().toIso8601String(),
    });

    if (_buffer.length >= _maxBufferSize) {
      _flush();
    } else {
      _scheduleFlush();
    }
  }

  /// Common convenience helpers to match website event names exactly.
  static void pageView(String page, [Map<String, dynamic>? extra]) =>
      log('PAGE_VIEW', {'page': page, ...?extra});

  static void search(String query) =>
      log('SEARCH', {'query': query});

  static void cartAdd(int productId, String productName, {int qty = 1}) =>
      log('CART_ADD', {'productId': productId, 'productName': productName, 'qty': qty});

  static void productView(int productId, String productName) =>
      log('PRODUCT_VIEW', {'productId': productId, 'productName': productName});

  static void wishlistToggle(int productId, bool added) =>
      log('WISHLIST_TOGGLE', {'productId': productId, 'added': added});

  static void orderPlaced(int orderId, double amount, String paymentMode) =>
      log('ORDER_PLACED', {'orderId': orderId, 'amount': amount, 'paymentMode': paymentMode});

  static void checkoutStarted(double cartTotal) =>
      log('CHECKOUT_STARTED', {'cartTotal': cartTotal});

  // ── Internal flush logic ────────────────────────────────────────────────────

  static void _scheduleFlush() {
    _flushTimer?.cancel();
    _flushTimer = Timer(_flushInterval, _flush);
  }

  static Future<void> _flush() async {
    if (_buffer.isEmpty) return;
    final toSend = List<Map<String, dynamic>>.from(_buffer);
    _buffer.clear();
    _flushTimer?.cancel();
    _flushTimer = null;

    try {
      await http.post(
        Uri.parse(ApiConfig.userActivityBatch),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(toSend),
      );
    } catch (_) {
      // On failure, re-buffer (silently, don't affect UX)
      _buffer.insertAll(0, toSend);
    }
  }

  /// Call this when the app goes to background / user logs out.
  static Future<void> flushNow() => _flush();
}
