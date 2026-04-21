// import 'dart:convert';
// import 'package:http/http.dart' as http;
// import '../config/api_config.dart';
// import '../models/user_session.dart';

// class AuthService {
//   static UserSession? currentUser;

//   static Map<String, String> get _json => {'Content-Type': 'application/json'};

//   static Map<String, dynamic> _parse(http.Response r) {
//     final body = r.body.trim();
//     if (body.startsWith('<') || body.isEmpty) {
//       return {'success': false, 'message': 'Server error (HTTP ${r.statusCode}). Check backend.'};
//     }
//     try {
//       return jsonDecode(body) as Map<String, dynamic>;
//     } catch (e) {
//       return {'success': false, 'message': 'Invalid server response: $e'};
//     }
//   }

//   static Future<Map<String, dynamic>> customerLogin(String email, String password) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.customerLogin),
//           headers: _json, body: jsonEncode({'email': email, 'password': password}));
//       final d = _parse(r);
//       if (d['success'] == true) {
//         currentUser = UserSession(
//           id: d['customerId'], name: d['name'], email: d['email'],
//           token: d['token'] ?? '', role: 'CUSTOMER',
//         );
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   static Future<Map<String, dynamic>> vendorLogin(String email, String password) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.vendorLogin),
//           headers: _json, body: jsonEncode({'email': email, 'password': password}));
//       final d = _parse(r);
//       if (d['success'] == true) {
//         currentUser = UserSession(
//           id: d['vendorId'], name: d['name'], email: d['email'],
//           token: d['token'] ?? '', role: 'VENDOR', vendorCode: d['vendorCode'],
//         );
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   static Future<Map<String, dynamic>> adminLogin(String email, String password) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.adminLogin),
//           headers: _json, body: jsonEncode({'email': email, 'password': password}));
//       final d = _parse(r);
//       if (d['success'] == true) {
//         currentUser = UserSession(
//           id: 0, name: 'Admin', email: email,
//           token: d['token'] ?? '', role: 'ADMIN',
//         );
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   /// Delivery Boy login — Flutter JSON endpoint (not the web session route).
//   /// Returns: { success, deliveryBoyId, name, email, deliveryBoyCode, status }
//   /// status: 'active' | 'unverified' | 'pending' | 'inactive'
//   static Future<Map<String, dynamic>> deliveryBoyLogin(
//       String email, String password) async {
//     try {
//       final r = await http.post(
//         Uri.parse(ApiConfig.deliveryLogin),
//         headers: _json,
//         body: jsonEncode({'email': email, 'password': password}),
//       );
//       final d = _parse(r);
//       if (d['success'] == true) {
//         currentUser = UserSession(
//           id: d['deliveryBoyId'] ?? 0,
//           name: d['name'] ?? '',
//           email: email,
//           token: d['token'] ?? '',
//           role: 'DELIVERY_BOY',
//           deliveryBoyCode: d['deliveryBoyCode'],
//         );
//       }
//       return d;
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   static Future<Map<String, dynamic>> customerRegister(
//       String name, String email, String mobile, String password) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.customerRegister),
//           headers: _json,
//           body: jsonEncode({'name': name, 'email': email, 'mobile': mobile, 'password': password}));
//       return _parse(r);
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   static Future<Map<String, dynamic>> vendorRegister(
//       String name, String email, String mobile, String password) async {
//     try {
//       final r = await http.post(Uri.parse(ApiConfig.vendorRegister),
//           headers: _json,
//           body: jsonEncode({'name': name, 'email': email, 'mobile': mobile, 'password': password}));
//       return _parse(r);
//     } catch (e) {
//       return {'success': false, 'message': 'Connection error: $e'};
//     }
//   }

//   static void logout() => currentUser = null;
// }
// auth_service.dart — with session persistence
//
// FIX: AuthService.currentUser was in-memory only.  After an app restart
// or hot restart it became null, so every service call sent X-Customer-Id: 0,
// the backend returned { success: false, message: "Customer not found" }, and
// getWishlist() / getOrders() silently returned [] — causing both screens to
// show the empty state even when data existed.
//
// This version persists the session to SharedPreferences so the user stays
// logged in across restarts.  Call AuthService.loadSavedSession() in main()
// before runApp().
//
// SETUP: add to pubspec.yaml dependencies:
//   shared_preferences: ^2.2.3

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/user_session.dart';

class AuthService {
  static UserSession? currentUser;

  // ── SharedPreferences keys ───────────────────────────────────────────────
  static const _kUserId          = 'auth_userId';
  static const _kUserName        = 'auth_userName';
  static const _kUserEmail       = 'auth_userEmail';
  static const _kUserToken       = 'auth_userToken';
  static const _kUserRole        = 'auth_userRole';
  static const _kVendorCode      = 'auth_vendorCode';
  static const _kDeliveryBoyCode = 'auth_deliveryBoyCode';

  static Map<String, String> get _json => {'Content-Type': 'application/json'};

  static Map<String, dynamic> _parse(http.Response r) {
    final body = r.body.trim();
    if (body.startsWith('<') || body.isEmpty) {
      return {'success': false, 'message': 'Server error (HTTP ${r.statusCode}). Check backend.'};
    }
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (e) {
      return {'success': false, 'message': 'Invalid server response: $e'};
    }
  }

  // ── Persist / restore ────────────────────────────────────────────────────

  /// Call once in main() before runApp() to restore a saved login session.
  static Future<void> loadSavedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final id = prefs.getInt(_kUserId);
      if (id == null) return; // no saved session
      currentUser = UserSession(
        id:              id,
        name:            prefs.getString(_kUserName)        ?? '',
        email:           prefs.getString(_kUserEmail)       ?? '',
        token:           prefs.getString(_kUserToken)       ?? '',
        role:            prefs.getString(_kUserRole)        ?? 'CUSTOMER',
        vendorCode:      prefs.getString(_kVendorCode),
        deliveryBoyCode: prefs.getString(_kDeliveryBoyCode),
      );
    } catch (_) {
      // Silently ignore — user will simply need to log in again.
    }
  }

  static Future<void> _saveSession(UserSession s) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_kUserId, s.id);
      await prefs.setString(_kUserName, s.name);
      await prefs.setString(_kUserEmail, s.email);
      await prefs.setString(_kUserToken, s.token);
      await prefs.setString(_kUserRole, s.role);
      if (s.vendorCode != null)      await prefs.setString(_kVendorCode, s.vendorCode!);
      if (s.deliveryBoyCode != null) await prefs.setString(_kDeliveryBoyCode, s.deliveryBoyCode!);
    } catch (_) {}
  }

  // ── Login / Register ──────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> customerLogin(String email, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.customerLogin),
          headers: _json, body: jsonEncode({'email': email, 'password': password}));
      final d = _parse(r);
      if (d['success'] == true) {
        final session = UserSession(
          id: d['customerId'], name: d['name'], email: d['email'],
          token: d['token'] ?? '', role: 'CUSTOMER',
        );
        currentUser = session;
        await _saveSession(session);
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> vendorLogin(String email, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.vendorLogin),
          headers: _json, body: jsonEncode({'email': email, 'password': password}));
      final d = _parse(r);
      if (d['success'] == true) {
        final session = UserSession(
          id: d['vendorId'], name: d['name'], email: d['email'],
          token: d['token'] ?? '', role: 'VENDOR', vendorCode: d['vendorCode'],
        );
        currentUser = session;
        await _saveSession(session);
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> adminLogin(String email, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.adminLogin),
          headers: _json, body: jsonEncode({'email': email, 'password': password}));
      final d = _parse(r);
      if (d['success'] == true) {
        final session = UserSession(
          id: 0, name: 'Admin', email: email,
          token: d['token'] ?? '', role: 'ADMIN',
        );
        currentUser = session;
        await _saveSession(session);
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// Delivery Boy login — Flutter JSON endpoint (not the web session route).
  /// Returns: { success, deliveryBoyId, name, email, deliveryBoyCode, status }
  /// status: 'active' | 'unverified' | 'pending' | 'inactive'
  static Future<Map<String, dynamic>> deliveryBoyLogin(
      String email, String password) async {
    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryLogin),
        headers: _json,
        body: jsonEncode({'email': email, 'password': password}),
      );
      final d = _parse(r);
      if (d['success'] == true) {
        final session = UserSession(
          id: d['deliveryBoyId'] ?? 0,
          name: d['name'] ?? '',
          email: email,
          token: d['token'] ?? '',
          role: 'DELIVERY_BOY',
          deliveryBoyCode: d['deliveryBoyCode'],
        );
        currentUser = session;
        await _saveSession(session);
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> customerSendOtp(
      String name, String email, String mobile, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.customerSendOtp),
          headers: _json,
          body: jsonEncode({'name': name, 'email': email, 'mobile': mobile, 'password': password}));
      return _parse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> customerVerifyOtp(
      String email, String otp) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.customerVerifyOtp),
          headers: _json,
          body: jsonEncode({'email': email, 'otp': otp}));
      final d = _parse(r);
      if (d['success'] == true) {
        final session = UserSession(
          id: d['customerId'], name: d['name'], email: d['email'],
          token: d['token'] ?? '', role: 'CUSTOMER',
        );
        currentUser = session;
        await _saveSession(session);
      }
      return d;
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> customerRegister(
      String name, String email, String mobile, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.customerRegister),
          headers: _json,
          body: jsonEncode({'name': name, 'email': email, 'mobile': mobile, 'password': password}));
      return _parse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> vendorRegister(
      String name, String email, String mobile, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.vendorRegister),
          headers: _json,
          body: jsonEncode({'name': name, 'email': email, 'mobile': mobile, 'password': password}));
      return _parse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  /// Delivery Boy registration — uses the new JSON endpoint.
  /// FIX: previously ApiConfig.deliveryRegister pointed to the Thymeleaf form.
  static Future<Map<String, dynamic>> deliveryBoyRegister(
      String name, String email, String mobile, String password) async {
    try {
      final r = await http.post(Uri.parse(ApiConfig.deliveryRegister),
          headers: _json,
          body: jsonEncode({'name': name, 'email': email, 'mobile': mobile, 'password': password}));
      return _parse(r);
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<void> logout() async {
    currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
    } catch (_) {}
  }
}