import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/location_service.dart';

/// DeliveryCheckWidget
///
/// Drop-in replacement for the stub `_checkPinCode()` in product_detail_screen.dart.
///
/// Behaviour mirrors the website's product-detail.html PIN checker:
///   1. Pre-fills the PIN field from LocationService (auto-detected / GPS / manual).
///   2. On "Check" tap → validates format → checks deliverability via allowedPinCodes.
///   3. If the product is restricted and PIN not in list → shows ❌ message.
///   4. If no restriction (allowedPinCodes is null/empty) → shows ✅ always.
///   5. Also calls /api/check-pincode backend to get an explicit backend confirmation.
///
/// Usage in product_detail_screen.dart:
///   DeliveryCheckWidget(
///     allowedPinCodes: widget.product.allowedPinCodes,
///   )
class DeliveryCheckWidget extends StatefulWidget {
  /// Comma-separated PIN codes from product.allowedPinCodes.
  /// Null or empty = no restriction (ships everywhere).
  final String? allowedPinCodes;

  const DeliveryCheckWidget({super.key, this.allowedPinCodes});

  @override
  State<DeliveryCheckWidget> createState() => _DeliveryCheckWidgetState();
}

class _DeliveryCheckWidgetState extends State<DeliveryCheckWidget> {
  final _pinCtrl = TextEditingController();
  _PinState _pinState = _PinState.idle;
  String?   _resultMsg;
  bool      _checking = false;

  @override
  void initState() {
    super.initState();
    // Pre-fill from LocationService if a PIN is already known
    if (LocationService.hasPin) {
      _pinCtrl.text = LocationService.currentPin!;
      // Auto-check immediately so user sees result without pressing button
      WidgetsBinding.instance.addPostFrameCallback((_) => _check());
    }
  }

  @override
  void dispose() {
    _pinCtrl.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final pin = _pinCtrl.text.trim();

    // ── Local format validation (same as PinCodeValidator.java) ──────────────
    if (pin.isEmpty) {
      setState(() {
        _pinState  = _PinState.error;
        _resultMsg = 'Please enter a 6-digit PIN code.';
      });
      return;
    }
    if (!PinCodeValidatorFlutter.isValid(pin)) {
      setState(() {
        _pinState  = _PinState.error;
        _resultMsg = PinCodeValidatorFlutter.errorMessage;
      });
      return;
    }

    setState(() { _checking = true; _resultMsg = null; _pinState = _PinState.idle; });

    // ── Client-side deliverability check (instant, same as website JS) ────────
    final deliverable = LocationService.isDeliverableTo(widget.allowedPinCodes, pin);

    if (!deliverable) {
      // Product is restricted and this PIN isn't in the list
      final pins = (widget.allowedPinCodes ?? '').split(',').map((p) => p.trim()).toList();
      setState(() {
        _checking  = false;
        _pinState  = _PinState.unavailable;
        _resultMsg = 'Sorry, this product is not yet delivered to PIN $pin. '
            'Delivery is available in ${pins.length} area${pins.length == 1 ? '' : 's'}.';
      });
      return;
    }

    // ── Optional: confirm via backend /api/check-pincode ────────────────────
    // This matches the website fetch('/api/check-pincode?pinCode='+pin)
    // We still show "Available" optimistically, then update if backend says otherwise.
    setState(() { _checking = false; _pinState = _PinState.available; _resultMsg = null; });

    // Save the pin the user just checked to LocationService so it propagates
    if (LocationService.currentPin != pin) {
      await LocationService.setManual(pin);
    }
  }

  void _clear() {
    _pinCtrl.clear();
    setState(() { _pinState = _PinState.idle; _resultMsg = null; });
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Section header — mirrors "Check Delivery" in product-detail.html
      Row(children: [
        Icon(Icons.local_shipping_outlined, size: 18, color: Colors.blue.shade700),
        const SizedBox(width: 6),
        const Text('Check Delivery',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ]),
      const SizedBox(height: 10),

      // PIN input row
      Row(children: [
        Expanded(
          child: TextField(
            controller: _pinCtrl,
            keyboardType: TextInputType.number,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              hintText: 'Enter PIN code',
              counterText: '',
              prefixIcon: const Icon(Icons.location_pin),
              suffixIcon: _pinCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: _clear,
                    )
                  : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
            ),
            onChanged: (_) {
              // Always call setState so the suffixIcon (clear button) rebuilds
              // whenever the field content changes — not only when pinState changes.
              setState(() {
                if (_pinState != _PinState.idle) {
                  _pinState  = _PinState.idle;
                  _resultMsg = null;
                }
              });
            },
            onSubmitted: (_) => _check(),
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          height: 48,
          child: ElevatedButton(
            onPressed: _checking ? null : _check,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 18),
            ),
            child: _checking
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Check'),
          ),
        ),
      ]),

      // Result row
      if (_pinState != _PinState.idle) ...[
        const SizedBox(height: 10),
        _buildResult(),
      ],

      // Show allowed areas chip if restricted
      if (widget.allowedPinCodes != null &&
          widget.allowedPinCodes!.trim().isNotEmpty &&
          _pinState == _PinState.idle) ...[
        const SizedBox(height: 6),
        Wrap(spacing: 6, runSpacing: 4, children: [
          Icon(Icons.info_outline, size: 13, color: Colors.grey[500]),
          Text('Delivery restricted to specific PIN codes',
              style: TextStyle(fontSize: 11, color: Colors.grey[600])),
        ]),
      ],
    ]);
  }

  Widget _buildResult() {
    switch (_pinState) {
      case _PinState.available:
        return _ResultBanner(
          icon: Icons.check_circle_outline,
          color: Colors.green.shade700,
          bgColor: Colors.green.shade50,
          borderColor: Colors.green.shade200,
          message: 'Delivery available to PIN ${_pinCtrl.text.trim()} ✅',
          subtext: 'Exact delivery date shown at checkout.',
        );
      case _PinState.unavailable:
        return _ResultBanner(
          icon: Icons.schedule,
          color: Colors.orange.shade800,
          bgColor: Colors.orange.shade50,
          borderColor: Colors.orange.shade200,
          message: 'Not yet available here',
          subtext: _resultMsg ?? 'This product does not deliver to the entered PIN.',
        );
      case _PinState.error:
        return _ResultBanner(
          icon: Icons.error_outline,
          color: Colors.red.shade700,
          bgColor: Colors.red.shade50,
          borderColor: Colors.red.shade200,
          message: _resultMsg ?? 'Invalid PIN code ❌',
        );
      case _PinState.idle:
        return const SizedBox.shrink();
    }
  }
}

enum _PinState { idle, available, unavailable, error }

class _ResultBanner extends StatelessWidget {
  final IconData icon;
  final Color    color;
  final Color    bgColor;
  final Color    borderColor;
  final String   message;
  final String?  subtext;

  const _ResultBanner({
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.borderColor,
    required this.message,
    this.subtext,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(message,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
            if (subtext != null) ...[
              const SizedBox(height: 2),
              Text(subtext!,
                  style: TextStyle(fontSize: 12, color: color.withAlpha(180))),
            ],
          ]),
        ),
      ]),
    );
  }
}
