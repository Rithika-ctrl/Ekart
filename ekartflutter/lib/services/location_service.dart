// import 'dart:convert';
// import 'package:http/http.dart' as http;
// import 'package:geolocator/geolocator.dart';
// import '../config/api_config.dart';

// // ─────────────────────────────────────────────────────────────────────────────
// // PIN Code Validator — mirrors PinCodeValidator.java on the backend
// // ─────────────────────────────────────────────────────────────────────────────

// class PinCodeValidatorFlutter {
//   static const String errorMessage =
//       'PIN code must be exactly 6 digits and a valid Indian PIN (not starting with 0).';

//   /// Returns true when [pin] is a valid Indian PIN code:
//   ///   - exactly 6 digits
//   ///   - does not start with 0
//   static bool isValid(String pin) {
//     final trimmed = pin.trim();
//     if (trimmed.length != 6) return false;
//     if (!RegExp(r'^\d{6}$').hasMatch(trimmed)) return false;
//     if (trimmed.startsWith('0')) return false;
//     return true;
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PinResult
// // ─────────────────────────────────────────────────────────────────────────────

// class PinResult {
//   final bool    success;
//   final String  pin;
//   final String  city;
//   final String  state;
//   final String  source;
//   final String? message;
//   final bool    outsideIndia;
//   final bool    pinMissing;

//   const PinResult({
//     required this.success,
//     required this.pin,
//     required this.city,
//     required this.state,
//     required this.source,
//     this.message,
//     this.outsideIndia = false,
//     this.pinMissing   = false,
//   });

//   factory PinResult.fromJson(Map<String, dynamic> j) => PinResult(
//         success:      j['success']      == true,
//         pin:          (j['pin']         ?? '') as String,
//         city:         (j['city']        ?? '') as String,
//         state:        (j['state']       ?? '') as String,
//         source:       (j['source']      ?? '') as String,
//         message:      j['message']      as String?,
//         outsideIndia: j['outsideIndia'] == true,
//         pinMissing:   j['pinMissing']   == true,
//       );

//   factory PinResult.failure(String message) => PinResult(
//         success: false,
//         pin:     '',
//         city:    '',
//         state:   '',
//         source:  'error',
//         message: message,
//       );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // LocationService
// // ─────────────────────────────────────────────────────────────────────────────

// /// Wraps all geocoding endpoints and holds the app-wide current PIN in memory.
// ///
// /// Static PIN state is shared across all widgets so that:
// ///   - [PinDetectorBar] writes the PIN when auto-detected / GPS / manually entered.
// ///   - [DeliveryCheckWidget] reads the PIN to pre-fill its field.
// class LocationService {
//   // ── In-memory PIN state ────────────────────────────────────────────────────
//   static String? _currentPin;

//   /// The last resolved PIN code, or null if none has been set yet.
//   static String? get currentPin => _currentPin;

//   /// True when a PIN has been resolved (auto-detect, GPS, or manual).
//   static bool get hasPin =>
//       _currentPin != null && _currentPin!.isNotEmpty;

//   /// Persist a manually entered PIN without hitting the network.
//   /// Called by [DeliveryCheckWidget] after a successful local check.
//   static Future<void> setManual(String pin) async {
//     _currentPin = pin.trim();
//   }

//   // ── Deliverability helper (mirrors website JS applyPinFilter) ─────────────

//   /// Returns true if [pin] can receive this product.
//   ///
//   /// [allowedPinCodes] is the raw comma-separated string from
//   /// [Product.allowedPinCodes]. Null / empty = no restriction → always true.
//   static bool isDeliverableTo(String? allowedPinCodes, String pin) {
//     if (allowedPinCodes == null || allowedPinCodes.trim().isEmpty) return true;
//     final list = allowedPinCodes
//         .split(',')
//         .map((p) => p.trim())
//         .where((p) => p.isNotEmpty)
//         .toList();
//     if (list.isEmpty) return true;
//     return list.contains(pin.trim());
//   }

//   // ── IP-based auto-detection ────────────────────────────────────────────────

//   /// Calls GET /api/geocode/auto — server detects PIN from request IP.
//   /// Quick, silent, no permissions needed. May fail on private / VPN IPs.
//   static Future<PinResult> autoDetect() async {
//     try {
//       final res = await http
//           .get(Uri.parse(ApiConfig.geocodeAuto))
//           .timeout(const Duration(seconds: 8));
//       if (res.statusCode == 200) {
//         final result =
//             PinResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
//         if (result.success && result.pin.isNotEmpty) {
//           _currentPin = result.pin;
//         }
//         return result;
//       }
//       return PinResult.failure('Server returned ${res.statusCode}');
//     } catch (e) {
//       return PinResult.failure('Auto-detect failed: $e');
//     }
//   }

//   // ── GPS reverse-geocode ────────────────────────────────────────────────────

//   /// Requests GPS permission, gets current position, then calls
//   /// GET /api/geocode/pin?lat=&lon= to reverse-geocode to an Indian PIN.
//   static Future<PinResult> fromGps() async {
//     try {
//       bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
//       if (!serviceEnabled) {
//         return PinResult.failure('Location services are disabled.');
//       }

//       LocationPermission perm = await Geolocator.checkPermission();
//       if (perm == LocationPermission.denied) {
//         perm = await Geolocator.requestPermission();
//         if (perm == LocationPermission.denied) {
//           return PinResult.failure('Location permission denied.');
//         }
//       }
//       if (perm == LocationPermission.deniedForever) {
//         return PinResult.failure('Location permission permanently denied.');
//       }

//       final pos = await Geolocator.getCurrentPosition(
//         locationSettings: const LocationSettings(
//           accuracy: LocationAccuracy.medium,
//           timeLimit: Duration(seconds: 10),
//         ),
//       );

//       final url = Uri.parse(ApiConfig.geocodePin).replace(queryParameters: {
//         'lat': pos.latitude.toString(),
//         'lon': pos.longitude.toString(),
//       });
//       final res = await http.get(url).timeout(const Duration(seconds: 8));
//       if (res.statusCode == 200) {
//         final result =
//             PinResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
//         if (result.success && result.pin.isNotEmpty) {
//           _currentPin = result.pin;
//         }
//         return result;
//       }
//       return PinResult.failure('Server returned ${res.statusCode}');
//     } catch (e) {
//       final msg = e.toString();
//       if (msg.contains('TimeoutException') || msg.contains('timed out')) {
//         return PinResult.failure(
//             'GPS timed out. Go outside/near a window and try again...');
//       }
//       return PinResult.failure('GPS error: $e');
//     }
//   }

//   // ── Manual PIN validation ──────────────────────────────────────────────────

//   /// Calls GET /api/check-pincode?pinCode= to validate a user-entered PIN.
//   static Future<PinResult> validatePin(String pin) async {
//     try {
//       final res = await http
//           .get(Uri.parse(ApiConfig.checkPinCode(pin)))
//           .timeout(const Duration(seconds: 8));
//       final body = jsonDecode(res.body) as Map<String, dynamic>;
//       if (res.statusCode == 200 && body['success'] == true) {
//         _currentPin = pin.trim();
//         return PinResult(
//           success: true,
//           pin:     pin,
//           city:    (body['city']  ?? '') as String,
//           state:   (body['state'] ?? '') as String,
//           source:  'manual',
//           message: body['message'] as String?,
//         );
//       }
//       return PinResult.failure(
//           (body['message'] ?? 'Invalid PIN code') as String);
//     } catch (e) {
//       return PinResult.failure('Validation failed: $e');
//     }
//   }
// }

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import '../config/api_config.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PIN Code Validator — mirrors PinCodeValidator.java on the backend
// ─────────────────────────────────────────────────────────────────────────────

class PinCodeValidatorFlutter {
  static const String errorMessage =
      'PIN code must be exactly 6 digits and a valid Indian PIN (not starting with 0).';

  /// Returns true when [pin] is a valid Indian PIN code:
  ///   - exactly 6 digits
  ///   - does not start with 0
  static bool isValid(String pin) {
    final trimmed = pin.trim();
    if (trimmed.length != 6) return false;
    if (!RegExp(r'^\d{6}$').hasMatch(trimmed)) return false;
    if (trimmed.startsWith('0')) return false;
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PinResult
// ─────────────────────────────────────────────────────────────────────────────

class PinResult {
  final bool    success;
  final String  pin;
  final String  city;
  final String  state;
  final String  source;
  final String? message;
  final bool    outsideIndia;
  final bool    pinMissing;

  const PinResult({
    required this.success,
    required this.pin,
    required this.city,
    required this.state,
    required this.source,
    this.message,
    this.outsideIndia = false,
    this.pinMissing   = false,
  });

  factory PinResult.fromJson(Map<String, dynamic> j) => PinResult(
        success:      j['success']      == true,
        pin:          (j['pin']         ?? '') as String,
        city:         (j['city']        ?? '') as String,
        state:        (j['state']       ?? '') as String,
        source:       (j['source']      ?? '') as String,
        message:      j['message']      as String?,
        outsideIndia: j['outsideIndia'] == true,
        pinMissing:   j['pinMissing']   == true,
      );

  factory PinResult.failure(String message) => PinResult(
        success: false,
        pin:     '',
        city:    '',
        state:   '',
        source:  'error',
        message: message,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// LocationService
// ─────────────────────────────────────────────────────────────────────────────

/// Wraps all geocoding endpoints and holds the app-wide current PIN in memory.
///
/// Static PIN state is shared across all widgets so that:
///   - [PinDetectorBar] writes the PIN when auto-detected / GPS / manually entered.
///   - [DeliveryCheckWidget] reads the PIN to pre-fill its field.
class LocationService {
  // ── In-memory PIN state ────────────────────────────────────────────────────
  static String? _currentPin;

  /// The last resolved PIN code, or null if none has been set yet.
  static String? get currentPin => _currentPin;

  /// True when a PIN has been resolved (auto-detect, GPS, or manual).
  static bool get hasPin =>
      _currentPin != null && _currentPin!.isNotEmpty;

  /// Persist a manually entered PIN without hitting the network.
  /// Called by [DeliveryCheckWidget] after a successful local check.
  static Future<void> setManual(String pin) async {
    _currentPin = pin.trim();
  }

  // ── Deliverability helper (mirrors website JS applyPinFilter) ─────────────

  /// Returns true if [pin] can receive this product.
  ///
  /// [allowedPinCodes] is the raw comma-separated string from
  /// [Product.allowedPinCodes]. Null / empty = no restriction → always true.
  static bool isDeliverableTo(String? allowedPinCodes, String pin) {
    if (allowedPinCodes == null || allowedPinCodes.trim().isEmpty) return true;
    final list = allowedPinCodes
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
    if (list.isEmpty) return true;
    return list.contains(pin.trim());
  }

  // ── IP-based auto-detection ────────────────────────────────────────────────

  /// Calls GET /api/geocode/auto — server detects PIN from request IP.
  /// Quick, silent, no permissions needed. May fail on private / VPN IPs.
  static Future<PinResult> autoDetect() async {
    try {
      final res = await http
          .get(Uri.parse(ApiConfig.geocodeAuto))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final result =
            PinResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
        if (result.success && result.pin.isNotEmpty) {
          _currentPin = result.pin;
        }
        return result;
      }
      return PinResult.failure('Server returned ${res.statusCode}');
    } catch (e) {
      return PinResult.failure('Auto-detect failed: $e');
    }
  }

  // ── GPS reverse-geocode ────────────────────────────────────────────────────

  /// Requests GPS permission, gets current position, then calls
  /// GET /api/geocode/pin?lat=&lon= to reverse-geocode to an Indian PIN.
  static Future<PinResult> fromGps() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return PinResult.failure('Location services are disabled.');
      }

      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) {
          return PinResult.failure('Location permission denied.');
        }
      }
      if (perm == LocationPermission.deniedForever) {
        return PinResult.failure('Location permission permanently denied.');
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );

      final url = Uri.parse(ApiConfig.geocodePin).replace(queryParameters: {
        'lat': pos.latitude.toString(),
        'lon': pos.longitude.toString(),
      });
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final result =
            PinResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
        if (result.success && result.pin.isNotEmpty) {
          _currentPin = result.pin;
        }
        return result;
      }
      return PinResult.failure('Server returned ${res.statusCode}');
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('TimeoutException') || msg.contains('timed out')) {
        return PinResult.failure(
            'GPS timed out. Go outside/near a window and try again...');
      }
      return PinResult.failure('GPS error: $e');
    }
  }

  // ── Manual PIN validation ──────────────────────────────────────────────────

  /// Calls GET /api/check-pincode?pinCode= to validate a user-entered PIN.
  static Future<PinResult> validatePin(String pin) async {
    try {
      final res = await http
          .get(Uri.parse(ApiConfig.checkPinCode(pin)))
          .timeout(const Duration(seconds: 8));
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200 && body['success'] == true) {
        _currentPin = pin.trim();
        return PinResult(
          success: true,
          pin:     pin,
          city:    (body['city']  ?? '') as String,
          state:   (body['state'] ?? '') as String,
          source:  'manual',
          message: body['message'] as String?,
        );
      }
      return PinResult.failure(
          (body['message'] ?? 'Invalid PIN code') as String);
    } catch (e) {
      return PinResult.failure('Validation failed: $e');
    }
  }
}