// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import '../services/location_service.dart';

// /// A banner bar shown below the search field on the Customer Home screen.
// ///
// /// Behaviour mirrors the website's auto-detection flow:
// ///   1. On init (if [autoDetectOnInit] is true) it silently calls IP-based
// ///      geocoding via [LocationService.autoDetect].
// ///   2. The user can tap the bar to open the **Delivery Location** bottom sheet,
// ///      where they can:
// ///        • Use GPS  → [LocationService.fromGps]
// ///        • Enter PIN manually and tap "Apply PIN Code"
// ///   3. Any resolved PIN is reported back via [onPinChanged].
// ///
// /// The bar appearance changes based on whether a PIN is already set.
// class PinDetectorBar extends StatefulWidget {
//   /// Called whenever the detected / entered PIN changes.
//   final void Function(String pin) onPinChanged;

//   /// If true, auto-detect via IP on widget init (silent, no permission needed).
//   final bool autoDetectOnInit;

//   const PinDetectorBar({
//     super.key,
//     required this.onPinChanged,
//     this.autoDetectOnInit = true,
//   });

//   @override
//   State<PinDetectorBar> createState() => _PinDetectorBarState();
// }

// class _PinDetectorBarState extends State<PinDetectorBar> {
//   String  _pin     = '';
//   String  _label   = 'Set your delivery PIN to check availability';
//   bool    _loading = false;

//   @override
//   void initState() {
//     super.initState();
//     if (widget.autoDetectOnInit) _autoDetect();
//   }

//   // ── Auto-detect (IP based, silent) ─────────────────────────────────────────
//   Future<void> _autoDetect() async {
//     setState(() => _loading = true);
//     final result = await LocationService.autoDetect();
//     if (!mounted) return;
//     if (result.success && result.pin.isNotEmpty) {
//       _applyPin(result.pin, result.city);
//     }
//     setState(() => _loading = false);
//   }

//   // ── Apply PIN and notify parent ─────────────────────────────────────────────
//   void _applyPin(String pin, [String city = '']) {
//     setState(() {
//       _pin   = pin;
//       _label = city.isNotEmpty ? 'Delivering to $city · $pin' : 'Delivering to $pin';
//     });
//     widget.onPinChanged(pin);
//   }

//   // ── Open bottom sheet ───────────────────────────────────────────────────────
//   void _openSheet() {
//     showModalBottomSheet(
//       context: context,
//       isScrollControlled: true,
//       backgroundColor: Colors.white,
//       shape: const RoundedRectangleBorder(
//         borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
//       ),
//       builder: (_) => _DeliveryLocationSheet(
//         currentPin: _pin,
//         onPinApplied: (pin, city) {
//           Navigator.pop(context);
//           _applyPin(pin, city);
//         },
//       ),
//     );
//   }

//   // ── Build ───────────────────────────────────────────────────────────────────
//   @override
//   Widget build(BuildContext context) {
//     final bool hasPIN = _pin.isNotEmpty;

//     return GestureDetector(
//       onTap: _openSheet,
//       child: Container(
//         width: double.infinity,
//         padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
//         decoration: BoxDecoration(
//           color: hasPIN ? Colors.green.shade50 : Colors.orange.shade50,
//           border: Border(
//             bottom: BorderSide(
//               color: hasPIN ? Colors.green.shade200 : Colors.orange.shade200,
//               width: 1,
//             ),
//           ),
//         ),
//         child: Row(
//           children: [
//             // Loading spinner or location icon
//             _loading
//                 ? SizedBox(
//                     width: 16,
//                     height: 16,
//                     child: CircularProgressIndicator(
//                       strokeWidth: 2,
//                       color: Colors.orange.shade700,
//                     ),
//                   )
//                 : Icon(
//                     hasPIN ? Icons.location_on : Icons.location_searching,
//                     size: 16,
//                     color: hasPIN ? Colors.green.shade700 : Colors.orange.shade700,
//                   ),
//             const SizedBox(width: 8),

//             // Label
//             Expanded(
//               child: Text(
//                 _label,
//                 style: TextStyle(
//                   fontSize: 12.5,
//                   color: hasPIN ? Colors.green.shade800 : Colors.orange.shade800,
//                   fontWeight: FontWeight.w500,
//                 ),
//                 maxLines: 1,
//                 overflow: TextOverflow.ellipsis,
//               ),
//             ),

//             // Chevron / "Set PIN" call to action
//             Row(
//               mainAxisSize: MainAxisSize.min,
//               children: [
//                 Text(
//                   hasPIN ? 'Change' : 'Set PIN',
//                   style: TextStyle(
//                     fontSize: 12,
//                     color: hasPIN ? Colors.green.shade700 : Colors.orange.shade700,
//                     fontWeight: FontWeight.bold,
//                   ),
//                 ),
//                 Icon(
//                   Icons.chevron_right,
//                   size: 16,
//                   color: hasPIN ? Colors.green.shade700 : Colors.orange.shade700,
//                 ),
//               ],
//             ),
//           ],
//         ),
//       ),
//     );
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Bottom Sheet
// // ─────────────────────────────────────────────────────────────────────────────

// class _DeliveryLocationSheet extends StatefulWidget {
//   final String currentPin;
//   final void Function(String pin, String city) onPinApplied;

//   const _DeliveryLocationSheet({
//     required this.currentPin,
//     required this.onPinApplied,
//   });

//   @override
//   State<_DeliveryLocationSheet> createState() => _DeliveryLocationSheetState();
// }

// class _DeliveryLocationSheetState extends State<_DeliveryLocationSheet> {
//   late final TextEditingController _pinCtrl;
//   bool   _gpsBusy        = false;
//   bool   _applyBusy      = false;
//   String _gpsError       = '';
//   String _applyError     = '';

//   @override
//   void initState() {
//     super.initState();
//     _pinCtrl = TextEditingController(text: widget.currentPin);
//   }

//   @override
//   void dispose() {
//     _pinCtrl.dispose();
//     super.dispose();
//   }

//   // ── GPS ──────────────────────────────────────────────────────────────────────
//   Future<void> _useGps() async {
//     setState(() {
//       _gpsBusy    = true;
//       _gpsError   = '';
//       _applyError = '';
//     });
//     final result = await LocationService.fromGps();
//     if (!mounted) return;
//     if (result.success && result.pin.isNotEmpty) {
//       widget.onPinApplied(result.pin, result.city);
//     } else {
//       setState(() {
//         _gpsBusy  = false;
//         _gpsError = result.message ?? 'Could not detect location.';
//       });
//     }
//   }

//   // ── Manual apply ─────────────────────────────────────────────────────────────
//   Future<void> _applyPin() async {
//     final pin = _pinCtrl.text.trim();
//     if (pin.length != 6 || int.tryParse(pin) == null) {
//       setState(() => _applyError = 'Please enter a valid 6-digit PIN code.');
//       return;
//     }
//     setState(() {
//       _applyBusy  = true;
//       _applyError = '';
//       _gpsError   = '';
//     });
//     final result = await LocationService.validatePin(pin);
//     if (!mounted) return;
//     if (result.success) {
//       widget.onPinApplied(pin, result.city);
//     } else {
//       setState(() {
//         _applyBusy  = false;
//         _applyError = result.message ?? 'Invalid PIN code.';
//       });
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Padding(
//       // Lift sheet above keyboard
//       padding: EdgeInsets.only(
//         bottom: MediaQuery.of(context).viewInsets.bottom,
//       ),
//       child: Column(
//         mainAxisSize: MainAxisSize.min,
//         crossAxisAlignment: CrossAxisAlignment.stretch,
//         children: [
//           // Handle bar
//           Center(
//             child: Container(
//               margin: const EdgeInsets.only(top: 12, bottom: 4),
//               width: 40,
//               height: 4,
//               decoration: BoxDecoration(
//                 color: Colors.grey.shade300,
//                 borderRadius: BorderRadius.circular(2),
//               ),
//             ),
//           ),

//           // Title
//           Padding(
//             padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 const Text(
//                   'Delivery Location',
//                   style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
//                 ),
//                 const SizedBox(height: 4),
//                 Text(
//                   'Products and availability vary by PIN code.',
//                   style: TextStyle(fontSize: 13.5, color: Colors.grey.shade600),
//                 ),
//               ],
//             ),
//           ),

//           const SizedBox(height: 20),

//           // ── Use GPS button ────────────────────────────────────────────────
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 20),
//             child: OutlinedButton.icon(
//               onPressed: _gpsBusy ? null : _useGps,
//               icon: _gpsBusy
//                   ? SizedBox(
//                       width: 18,
//                       height: 18,
//                       child: CircularProgressIndicator(
//                         strokeWidth: 2,
//                         color: Colors.teal.shade600,
//                       ),
//                     )
//                   : Icon(Icons.my_location, color: Colors.teal.shade700),
//               label: Text(
//                 _gpsBusy ? 'Detecting location…' : 'Use My Current Location',
//                 style: TextStyle(
//                   color: Colors.teal.shade700,
//                   fontWeight: FontWeight.w600,
//                 ),
//               ),
//               style: OutlinedButton.styleFrom(
//                 side: BorderSide(color: Colors.teal.shade400, width: 1.5),
//                 padding: const EdgeInsets.symmetric(vertical: 14),
//                 shape: RoundedRectangleBorder(
//                   borderRadius: BorderRadius.circular(30),
//                 ),
//                 backgroundColor: Colors.teal.shade50,
//               ),
//             ),
//           ),

//           // GPS error
//           if (_gpsError.isNotEmpty)
//             Padding(
//               padding: const EdgeInsets.fromLTRB(22, 6, 22, 0),
//               child: Text(
//                 _gpsError,
//                 style: const TextStyle(color: Colors.red, fontSize: 12),
//               ),
//             ),

//           // OR divider
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
//             child: Row(children: [
//               Expanded(child: Divider(color: Colors.grey.shade300)),
//               Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 12),
//                 child: Text('OR',
//                     style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
//               ),
//               Expanded(child: Divider(color: Colors.grey.shade300)),
//             ]),
//           ),

//           // ── Manual PIN field ──────────────────────────────────────────────
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 20),
//             child: TextField(
//               controller: _pinCtrl,
//               keyboardType: TextInputType.number,
//               maxLength: 6,
//               inputFormatters: [FilteringTextInputFormatter.digitsOnly],
//               decoration: InputDecoration(
//                 hintText: 'Enter PIN Code',
//                 hintStyle: TextStyle(color: Colors.red.shade400),
//                 prefixIcon: Icon(Icons.location_on_outlined,
//                     color: Colors.grey.shade600),
//                 counterText: '',
//                 border: OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(10),
//                   borderSide: BorderSide(color: Colors.red.shade300),
//                 ),
//                 enabledBorder: OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(10),
//                   borderSide: BorderSide(color: Colors.red.shade300),
//                 ),
//                 focusedBorder: OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(10),
//                   borderSide: BorderSide(color: Colors.red.shade500, width: 1.8),
//                 ),
//               ),
//               onSubmitted: (_) => _applyPin(),
//             ),
//           ),

//           // Apply error
//           if (_applyError.isNotEmpty)
//             Padding(
//               padding: const EdgeInsets.fromLTRB(22, 6, 22, 0),
//               child: Text(
//                 _applyError,
//                 style: const TextStyle(color: Colors.red, fontSize: 12),
//               ),
//             ),

//           const SizedBox(height: 20),

//           // ── Apply button ──────────────────────────────────────────────────
//           Padding(
//             padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
//             child: ElevatedButton(
//               onPressed: _applyBusy ? null : _applyPin,
//               style: ElevatedButton.styleFrom(
//                 backgroundColor: Colors.blue.shade700,
//                 foregroundColor: Colors.white,
//                 padding: const EdgeInsets.symmetric(vertical: 16),
//                 shape: RoundedRectangleBorder(
//                   borderRadius: BorderRadius.circular(10),
//                 ),
//                 elevation: 0,
//               ),
//               child: _applyBusy
//                   ? const SizedBox(
//                       height: 20,
//                       width: 20,
//                       child: CircularProgressIndicator(
//                         color: Colors.white,
//                         strokeWidth: 2.5,
//                       ),
//                     )
//                   : const Text(
//                       'Apply PIN Code',
//                       style: TextStyle(
//                           fontSize: 16, fontWeight: FontWeight.bold),
//                     ),
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/location_service.dart';

/// A banner bar shown below the search field on the Customer Home screen.
///
/// Behaviour mirrors the website's auto-detection flow:
///   1. On init (if [autoDetectOnInit] is true) it silently calls IP-based
///      geocoding via [LocationService.autoDetect].
///   2. The user can tap the bar to open the **Delivery Location** bottom sheet,
///      where they can:
///        • Use GPS  → [LocationService.fromGps]
///        • Enter PIN manually and tap "Apply PIN Code"
///   3. Any resolved PIN is reported back via [onPinChanged].
///
/// The bar appearance changes based on whether a PIN is already set.
class PinDetectorBar extends StatefulWidget {
  /// Called whenever the detected / entered PIN changes.
  final void Function(String pin) onPinChanged;

  /// If true, auto-detect via IP on widget init (silent, no permission needed).
  final bool autoDetectOnInit;

  const PinDetectorBar({
    super.key,
    required this.onPinChanged,
    this.autoDetectOnInit = true,
  });

  @override
  State<PinDetectorBar> createState() => _PinDetectorBarState();
}

class _PinDetectorBarState extends State<PinDetectorBar> {
  String _pin     = '';
  String _label   = 'Set your delivery PIN to check availability';
  bool   _loading = false;

  @override
  void initState() {
    super.initState();
    // If a PIN was already set (e.g. from a previous screen), show it immediately.
    if (LocationService.hasPin) {
      _pin   = LocationService.currentPin!;
      _label = 'Delivering to $_pin';
    }
    if (widget.autoDetectOnInit && !LocationService.hasPin) _autoDetect();
  }

  // ── Auto-detect (IP based, silent) ─────────────────────────────────────────
  Future<void> _autoDetect() async {
    setState(() => _loading = true);
    final result = await LocationService.autoDetect();
    if (!mounted) return;
    if (result.success && result.pin.isNotEmpty) {
      _applyPin(result.pin, result.city);
    }
    setState(() => _loading = false);
  }

  // ── Apply PIN and notify parent ─────────────────────────────────────────────
  void _applyPin(String pin, [String city = '']) {
    setState(() {
      _pin   = pin;
      _label = city.isNotEmpty ? 'Delivering to $city · $pin' : 'Delivering to $pin';
    });
    widget.onPinChanged(pin);
  }

  // ── Open bottom sheet ───────────────────────────────────────────────────────
  void _openSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _DeliveryLocationSheet(
        currentPin: _pin,
        onPinApplied: (pin, city) {
          Navigator.pop(context);
          _applyPin(pin, city);
        },
      ),
    );
  }

  // ── Build ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final bool hasPIN = _pin.isNotEmpty;

    return GestureDetector(
      onTap: _openSheet,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: hasPIN ? Colors.green.shade50 : Colors.orange.shade50,
          border: Border(
            bottom: BorderSide(
              color: hasPIN ? Colors.green.shade200 : Colors.orange.shade200,
              width: 1,
            ),
          ),
        ),
        child: Row(
          children: [
            _loading
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.orange.shade700,
                    ),
                  )
                : Icon(
                    hasPIN ? Icons.location_on : Icons.location_searching,
                    size: 16,
                    color: hasPIN ? Colors.green.shade700 : Colors.orange.shade700,
                  ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _label,
                style: TextStyle(
                  fontSize: 12.5,
                  color: hasPIN ? Colors.green.shade800 : Colors.orange.shade800,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  hasPIN ? 'Change' : 'Set PIN',
                  style: TextStyle(
                    fontSize: 12,
                    color: hasPIN ? Colors.green.shade700 : Colors.orange.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: hasPIN ? Colors.green.shade700 : Colors.orange.shade700,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Sheet
// ─────────────────────────────────────────────────────────────────────────────

class _DeliveryLocationSheet extends StatefulWidget {
  final String currentPin;
  final void Function(String pin, String city) onPinApplied;

  const _DeliveryLocationSheet({
    required this.currentPin,
    required this.onPinApplied,
  });

  @override
  State<_DeliveryLocationSheet> createState() => _DeliveryLocationSheetState();
}

class _DeliveryLocationSheetState extends State<_DeliveryLocationSheet> {
  late final TextEditingController _pinCtrl;
  bool   _gpsBusy    = false;
  bool   _applyBusy  = false;
  String _gpsError   = '';
  String _applyError = '';

  @override
  void initState() {
    super.initState();
    _pinCtrl = TextEditingController(text: widget.currentPin);
  }

  @override
  void dispose() {
    _pinCtrl.dispose();
    super.dispose();
  }

  // ── GPS ────────────────────────────────────────────────────────────────────
  Future<void> _useGps() async {
    setState(() {
      _gpsBusy    = true;
      _gpsError   = '';
      _applyError = '';
    });
    final result = await LocationService.fromGps();
    if (!mounted) return;
    if (result.success && result.pin.isNotEmpty) {
      widget.onPinApplied(result.pin, result.city);
    } else {
      setState(() {
        _gpsBusy  = false;
        _gpsError = result.message ?? 'Could not detect location.';
      });
    }
  }

  // ── Manual apply ───────────────────────────────────────────────────────────
  // Uses LOCAL format validation only (PinCodeValidatorFlutter).
  // Does NOT call the backend — /api/check-pincode checks serviceability,
  // not whether a PIN is real, so it would reject valid PINs outside the
  // vendor's delivery zone. Format check is sufficient here.
  Future<void> _applyPin() async {
    final pin = _pinCtrl.text.trim();

    // Local format validation
    if (!PinCodeValidatorFlutter.isValid(pin)) {
      setState(() => _applyError = PinCodeValidatorFlutter.errorMessage);
      return;
    }

    setState(() {
      _applyBusy  = true;
      _applyError = '';
      _gpsError   = '';
    });

    // Save to LocationService so DeliveryCheckWidget picks it up
    await LocationService.setManual(pin);

    if (!mounted) return;
    widget.onPinApplied(pin, '');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Title
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Delivery Location',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Products and availability vary by PIN code.',
                  style: TextStyle(fontSize: 13.5, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── Use GPS button ──────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: OutlinedButton.icon(
              onPressed: _gpsBusy ? null : _useGps,
              icon: _gpsBusy
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.teal.shade600,
                      ),
                    )
                  : Icon(Icons.my_location, color: Colors.teal.shade700),
              label: Text(
                _gpsBusy ? 'Detecting location…' : 'Use My Current Location',
                style: TextStyle(
                  color: Colors.teal.shade700,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: Colors.teal.shade400, width: 1.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                backgroundColor: Colors.teal.shade50,
              ),
            ),
          ),

          // GPS error
          if (_gpsError.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 6, 22, 0),
              child: Text(
                _gpsError,
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),

          // OR divider
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(children: [
              Expanded(child: Divider(color: Colors.grey.shade300)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('OR',
                    style:
                        TextStyle(color: Colors.grey.shade500, fontSize: 13)),
              ),
              Expanded(child: Divider(color: Colors.grey.shade300)),
            ]),
          ),

          // ── Manual PIN field ────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _pinCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) {
                if (_applyError.isNotEmpty) {
                  setState(() => _applyError = '');
                }
              },
              decoration: InputDecoration(
                hintText: 'Enter PIN Code',
                hintStyle: TextStyle(color: Colors.red.shade400),
                prefixIcon: Icon(Icons.location_on_outlined,
                    color: Colors.grey.shade600),
                counterText: '',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: Colors.red.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: Colors.red.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: Colors.red.shade500, width: 1.8),
                ),
              ),
              onSubmitted: (_) => _applyPin(),
            ),
          ),

          // Apply error
          if (_applyError.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 6, 22, 0),
              child: Text(
                _applyError,
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),

          const SizedBox(height: 20),

          // ── Apply button ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
            child: ElevatedButton(
              onPressed: _applyBusy ? null : _applyPin,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
              ),
              child: _applyBusy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Text(
                      'Apply PIN Code',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}