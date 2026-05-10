import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

Map<String, String> _customerHeaders() => {
      'Content-Type': 'application/json',
      'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
    };

Map<String, dynamic> _safeParse(http.Response r) {
  final body = r.body.trim();
  if (body.startsWith('<') || body.isEmpty) {
    return {'success': false, 'message': 'Server error (${r.statusCode})'};
  }
  try {
    return jsonDecode(body) as Map<String, dynamic>;
  } catch (e) {
    return {'success': false, 'message': 'Invalid response: $e'};
  }
}

/// Handles the three-step Razorpay payment flow:
///   1. createOrder  → calls /api/flutter/orders/razorpay/checkout
///   2. verifyCallback → calls /api/flutter/orders/razorpay/callback
///   3. placeOrder   → calls /api/flutter/orders/razorpay/place
class RazorpayService {
  /// Step 1: Create a Razorpay order on the backend.
  /// Returns: { success, razorpayOrderId, amount, currency, razorpayKeyId,
  ///            tempOrderId, customerName, customerEmail, ... }
  static Future<Map<String, dynamic>> createOrder({
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
        'recipientName': recipientName,
        'houseStreet':   houseStreet,
        'city':          city,
        'state':         state,
        'postalCode':    postalCode,
        'deliveryTime':  deliveryTime,
      };
      if (couponCode != null && couponCode.isNotEmpty) {
        body['couponCode'] = couponCode;
      }
      final r = await http.post(
        Uri.parse(ApiConfig.razorpayCheckout),
        headers: _customerHeaders(),
        body: jsonEncode(body),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Step 2: Verify the Razorpay signature after payment completion.
  /// Returns: { success, verified, ... }
  static Future<Map<String, dynamic>> verifyPayment({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.razorpayCallback),
        headers: _customerHeaders(),
        body: jsonEncode({
          'razorpay_order_id':   razorpayOrderId,
          'razorpay_payment_id': razorpayPaymentId,
          'razorpay_signature':  razorpaySignature,
        }),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  /// Step 3: Place the final order after successful payment verification.
  /// Returns: { success, orderId, totalPrice, ... }
  static Future<Map<String, dynamic>> placeOrder({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
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
        'razorpay_order_id':   razorpayOrderId,
        'razorpay_payment_id': razorpayPaymentId,
        'razorpay_signature':  razorpaySignature,
        'recipientName':       recipientName,
        'houseStreet':         houseStreet,
        'city':                city,
        'state':               state,
        'postalCode':          postalCode,
        'deliveryTime':        deliveryTime,
      };
      if (couponCode != null && couponCode.isNotEmpty) {
        body['couponCode'] = couponCode;
      }
      final r = await http.post(
        Uri.parse(ApiConfig.razorpayPlaceOrder),
        headers: _customerHeaders(),
        body: jsonEncode(body),
      );
      return _safeParse(r);
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }
}
