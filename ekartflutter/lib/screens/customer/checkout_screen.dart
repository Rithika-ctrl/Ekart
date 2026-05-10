import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart';

import '../../services/services.dart';
import '../../services/location_service.dart';
import '../../services/razorpay_service.dart';
import '../../services/gst_service.dart';
import '../../services/activity_service.dart';

// ── Address selection index convention ────────────────────────────────────────
//  -1   → "Use current location" (auto-detect via IP)
//  null → "Add a new address"   (blank manual form)
//  >= 0 → index into _savedAddresses

class CheckoutScreen extends StatefulWidget {
  final double cartTotal;
  const CheckoutScreen({super.key, required this.cartTotal});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  // ── Address form controllers ──────────────────────────────────────────────
  final _recipientNameCtrl = TextEditingController();
  final _houseStreetCtrl   = TextEditingController();
  final _cityCtrl          = TextEditingController();
  final _stateCtrl         = TextEditingController();
  final _pinCtrl           = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  // ── Coupon ────────────────────────────────────────────────────────────────
  final _couponCtrl        = TextEditingController();
  bool   _validatingCoupon = false;
  bool   _couponApplied    = false;
  String _couponMessage    = '';
  double _couponDiscount   = 0.0;
  String? _appliedCouponCode;
  List<Map<String, dynamic>> _availableCoupons = [];
  bool _loadingCoupons = false;

  String paymentMode  = 'COD';
  String deliveryTime = 'STANDARD';
  bool   placing      = false;

  // ── GST Breakdown ─────────────────────────────────────────────────────────
  GstBreakdown? _gstBreakdown;
  bool          _loadingGst = false;
  bool          _showGst    = false;

  // ── Address state ─────────────────────────────────────────────────────────
  List<Map<String, dynamic>> _savedAddresses    = [];
  bool                       _loadingAddresses  = true;
  int?                       _selectedAddrIdx;     // null | -1 | 0,1,2…
  bool                       _isEditingSelected = false;

  // Auto-detect state
  bool   _detectingLocation = false;
  String _detectedLabel     = '';
  bool   _detectFailed      = false;

  double get deliveryCharge  => deliveryTime == 'EXPRESS' ? 50.0 : 0.0;
  double get subtotalWithDel => widget.cartTotal + deliveryCharge;
  double get grandTotal =>
      (subtotalWithDel - _couponDiscount).clamp(0, double.infinity);

  /// Show the manual form when auto-detect, new address, or editing.
  bool get _showManualForm =>
      _selectedAddrIdx == null ||
      _selectedAddrIdx == -1 ||
      _isEditingSelected;

  /// City/state/PIN are locked (read-only) once auto-detected successfully.
  bool get _locationLocked =>
      _selectedAddrIdx == -1 &&
      !_detectingLocation &&
      !_detectFailed &&
      _cityCtrl.text.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadSavedAddresses();
    _loadCoupons();
    _loadGst();
    ActivityService.checkoutStarted(widget.cartTotal);
  }

  @override
  void dispose() {
    _recipientNameCtrl.dispose();
    _houseStreetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _pinCtrl.dispose();
    _couponCtrl.dispose();
    super.dispose();
  }

  // ── Loaders ───────────────────────────────────────────────────────────────

  Future<void> _loadSavedAddresses() async {
    setState(() => _loadingAddresses = true);
    try {
      final profile = await ProfileService.getProfile();
      if (!mounted) return;
      final rawAddrs = List<Map<String, dynamic>>.from(
          (profile['addresses'] ??
              profile['profile']?['addresses'] ??
              []) as List);
      // Strip entries with no usable content (blank profile address slots)
      final addrs = rawAddrs.where((a) {
        final name   = (a['recipientName'] ?? '').toString().trim();
        final street = (a['houseStreet']   ?? '').toString().trim();
        final city   = (a['city']          ?? '').toString().trim();
        final pin    = (a['postalCode']    ?? '').toString().trim();
        return name.isNotEmpty || street.isNotEmpty ||
               city.isNotEmpty  || pin.isNotEmpty;
      }).toList();
      setState(() {
        _savedAddresses   = addrs;
        _loadingAddresses = false;
        if (addrs.isNotEmpty) {
          _selectedAddrIdx   = 0;
          _isEditingSelected = false;
          _fillFromSaved(addrs[0]);
        } else {
          // No saved addresses — default to auto-detect
          _selectedAddrIdx = -1;
          _autoDetectLocation();
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingAddresses = false;
        _selectedAddrIdx  = -1;
        _autoDetectLocation();
      });
    }
  }

  Future<void> _loadCoupons() async {
    setState(() => _loadingCoupons = true);
    final list = await CouponService.getActiveCoupons();
    if (!mounted) return;
    setState(() {
      _availableCoupons = list;
      _loadingCoupons   = false;
    });
  }

  // ── GST Breakdown ─────────────────────────────────────────────────────────

  Future<void> _loadGst() async {
    if (widget.cartTotal <= 0) return;
    setState(() => _loadingGst = true);
    final breakdown = await GstService.getCartGst(widget.cartTotal);
    if (!mounted) return;
    setState(() {
      _gstBreakdown = breakdown;
      _loadingGst   = false;
    });
  }

  // ── Razorpay Online Payment ───────────────────────────────────────────────

  Future<void> _initiateRazorpay() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => placing = true);

    // Step 1 — create Razorpay order on backend
    final orderRes = await RazorpayService.createOrder(
      recipientName: _recipientNameCtrl.text.trim(),
      houseStreet:   _houseStreetCtrl.text.trim(),
      city:          _cityCtrl.text.trim(),
      state:         _stateCtrl.text.trim(),
      postalCode:    _pinCtrl.text.trim(),
      deliveryTime:  deliveryTime,
      couponCode:    _couponApplied ? _appliedCouponCode : null,
    );

    if (!mounted) return;

    if (orderRes['success'] != true) {
      setState(() => placing = false);
      _snack(orderRes['message'] ?? 'Failed to initiate payment', Colors.red);
      return;
    }

    setState(() => placing = false);

    // Step 2 — open Razorpay WebView sheet
    final razorpayKeyId    = orderRes['razorpayKeyId']   as String? ?? '';
    final razorpayOrderId  = orderRes['razorpayOrderId'] as String? ?? '';
    final amount           = (orderRes['amount'] ?? 0) as int; // paise
    final currency         = orderRes['currency'] as String? ?? 'INR';
    final customerName     = orderRes['customerName']  as String? ?? '';
    final customerEmail    = orderRes['customerEmail'] as String? ?? '';

    if (!mounted) return;
    final result = await Navigator.push<Map<String, String>>(
      context,
      MaterialPageRoute(
        builder: (_) => _RazorpayWebViewScreen(
          keyId:          razorpayKeyId,
          razorpayOrderId: razorpayOrderId,
          amount:         amount,
          currency:       currency,
          customerName:   customerName,
          customerEmail:  customerEmail,
          description:    'Ekart Order',
        ),
      ),
    );

    if (!mounted || result == null) return;

    // Step 3 — place the final order with verified payment details
    setState(() => placing = true);
    final placeRes = await RazorpayService.placeOrder(
      razorpayOrderId:   result['razorpay_order_id']!,
      razorpayPaymentId: result['razorpay_payment_id']!,
      razorpaySignature: result['razorpay_signature']!,
      recipientName:     _recipientNameCtrl.text.trim(),
      houseStreet:       _houseStreetCtrl.text.trim(),
      city:              _cityCtrl.text.trim(),
      state:             _stateCtrl.text.trim(),
      postalCode:        _pinCtrl.text.trim(),
      deliveryTime:      deliveryTime,
      couponCode:        _couponApplied ? _appliedCouponCode : null,
    );
    setState(() => placing = false);
    if (!mounted) return;

    if (placeRes['success'] == true) {
      ActivityService.orderPlaced(
        placeRes['orderId'] ?? 0,
        (placeRes['totalPrice'] as num? ?? 0).toDouble(),
        'ONLINE',
      );
      _showOrderSuccess(placeRes);
    } else {
      _snack(placeRes['message'] ?? 'Payment verified but order failed', Colors.red);
    }
  }

  // ── Auto-detect: GPS first, IP-detect fallback ───────────────────────────

  Future<void> _autoDetectLocation() async {
    setState(() {
      _detectingLocation = true;
      _detectFailed      = false;
      _detectedLabel     = '';
    });
    _clearLocationFields();

    // 1. Try GPS via LocationService (uses geolocator + /api/geocode/pin)
    final gpsResult = await LocationService.fromGps();
    if (!mounted) return;

    if (gpsResult.success && gpsResult.pin.isNotEmpty) {
      _applyLocationResult(gpsResult);
      return;
    }

    // 2. Fall back to IP-based auto-detect (/api/geocode/auto)
    final ipResult = await LocationService.autoDetect();
    if (!mounted) return;

    if (ipResult.success && ipResult.pin.isNotEmpty) {
      _applyLocationResult(ipResult);
    } else {
      setState(() {
        _detectingLocation = false;
        _detectFailed      = true;
      });
    }
  }

  void _applyLocationResult(PinResult result) {
    setState(() {
      _cityCtrl.text     = result.city;
      _stateCtrl.text    = result.state;
      _pinCtrl.text      = result.pin;
      _detectedLabel     = [result.city, result.state, result.pin]
          .where((s) => s.isNotEmpty)
          .join(', ');
      _detectingLocation = false;
      _detectFailed      = false;
    });
  }

  // ── Address helpers ───────────────────────────────────────────────────────

  void _fillFromSaved(Map<String, dynamic> addr) {
    _recipientNameCtrl.text = (addr['recipientName'] ?? '') as String;
    _houseStreetCtrl.text   = (addr['houseStreet']   ?? '') as String;
    _cityCtrl.text          = (addr['city']           ?? '') as String;
    _stateCtrl.text         = (addr['state']          ?? '') as String;
    _pinCtrl.text           = (addr['postalCode']     ?? '') as String;
  }

  void _clearAddressFields() {
    _recipientNameCtrl.clear();
    _houseStreetCtrl.clear();
    _clearLocationFields();
  }

  void _clearLocationFields() {
    _cityCtrl.clear();
    _stateCtrl.clear();
    _pinCtrl.clear();
  }

  void _selectDetectLocation() {
    // Always re-run detection when tapped (even if already selected)
    setState(() {
      _selectedAddrIdx   = -1;
      _isEditingSelected = false;
    });
    _clearAddressFields();
    _autoDetectLocation();
  }

  void _selectSavedAddress(int idx) {
    if (_selectedAddrIdx == idx && !_isEditingSelected) return;
    setState(() {
      _selectedAddrIdx   = idx;
      _isEditingSelected = false;
    });
    _fillFromSaved(_savedAddresses[idx]);
  }

  void _selectNewAddress() {
    if (_selectedAddrIdx == null && !_isEditingSelected) return;
    setState(() {
      _selectedAddrIdx   = null;
      _isEditingSelected = false;
    });
    _clearAddressFields();
  }

  void _startEditingSelected() =>
      setState(() => _isEditingSelected = true);

  void _cancelEditingSelected() {
    if (_selectedAddrIdx != null && _selectedAddrIdx! >= 0) {
      _fillFromSaved(_savedAddresses[_selectedAddrIdx!]);
    }
    setState(() => _isEditingSelected = false);
  }

  // ── Coupon ────────────────────────────────────────────────────────────────

  Future<void> _validateCoupon() async {
    final code = _couponCtrl.text.trim().toUpperCase();
    if (code.isEmpty) return;
    setState(() => _validatingCoupon = true);
    final res = await CouponService.validateCoupon(code, subtotalWithDel);
    setState(() {
      _validatingCoupon = false;
      if (res['valid'] == true || res['success'] == true) {
        _couponApplied     = true;
        _couponDiscount    = (res['discount'] as num? ?? 0).toDouble();
        _appliedCouponCode = code;
        _couponMessage = res['message'] ??
            'Coupon applied! You save ₹${_couponDiscount.toStringAsFixed(2)}';
      } else {
        _couponApplied     = false;
        _couponDiscount    = 0.0;
        _appliedCouponCode = null;
        _couponMessage     = res['message'] ?? 'Invalid coupon code';
      }
    });
  }

  void _removeCoupon() => setState(() {
        _couponApplied     = false;
        _couponDiscount    = 0.0;
        _appliedCouponCode = null;
        _couponMessage     = '';
        _couponCtrl.clear();
      });

  void _applyCouponFromList(String code) {
    _couponCtrl.text = code;
    _validateCoupon();
  }

  // ── Order placement ───────────────────────────────────────────────────────

  Future<void> _placeOrder() async {
    // Route to Razorpay for ONLINE payments
    if (paymentMode == 'ONLINE') {
      return _initiateRazorpay();
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() => placing = true);
    final res = await OrderService.placeOrderStructured(
      paymentMode:   paymentMode,
      recipientName: _recipientNameCtrl.text.trim(),
      houseStreet:   _houseStreetCtrl.text.trim(),
      city:          _cityCtrl.text.trim(),
      state:         _stateCtrl.text.trim(),
      postalCode:    _pinCtrl.text.trim(),
      deliveryTime:  deliveryTime,
      couponCode:    _couponApplied ? _appliedCouponCode : null,
    );
    setState(() => placing = false);
    if (!mounted) return;
    if (res['success'] == true) {
      ActivityService.orderPlaced(
        res['orderId'] ?? 0,
        (res['totalPrice'] as num? ?? 0).toDouble(),
        'COD',
      );
      _showOrderSuccess(res);
    } else {
      _snack(res['message'] ?? 'Order failed', Colors.red);
    }
  }

  void _showOrderSuccess(Map<String, dynamic> res) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.check_circle, color: Colors.green.shade600, size: 72),
          const SizedBox(height: 16),
          const Text('Order Placed!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Order #${res['orderId']}',
              style: TextStyle(color: Colors.grey[600])),
          const SizedBox(height: 4),
          Text('Total: ₹${(res['totalPrice'] as num).toStringAsFixed(2)}',
              style: TextStyle(
                  color: Colors.blue.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 16)),
          if (_couponApplied && _couponDiscount > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200)),
              child: Text(
                  '🎉 Saved ₹${_couponDiscount.toStringAsFixed(2)} with coupon!',
                  style: TextStyle(color: Colors.green.shade700, fontSize: 12)),
            ),
          ],
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Row(children: [
                Icon(Icons.location_on, size: 14, color: Colors.blue.shade700),
                const SizedBox(width: 4),
                Text('Delivering to',
                    style: TextStyle(
                        fontSize: 11, color: Colors.grey.shade600)),
              ]),
              const SizedBox(height: 4),
              Text(
                '${_recipientNameCtrl.text.trim()}\n'
                '${_houseStreetCtrl.text.trim()}\n'
                '${_cityCtrl.text.trim()}, '
                '${_stateCtrl.text.trim()} - ${_pinCtrl.text.trim()}',
                style: const TextStyle(fontSize: 12),
              ),
            ]),
          ),
          const SizedBox(height: 14),
          const Text('Thank you for shopping with Ekart!',
              textAlign: TextAlign.center),
        ]),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // close dialog
              Navigator.pop(context); // back to cart/home
            },
            child: const Text('Continue Shopping'),
          ),
        ],
      ),
    );
  }

  void _snack(String msg, Color color) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(msg),
          backgroundColor: color,
          behavior: SnackBarBehavior.floating));

  String? _required(String? v, String field) =>
      (v == null || v.trim().isEmpty) ? 'Please enter $field' : null;

  String? _validatePin(String? v) {
    if (v == null || v.trim().isEmpty) return 'Please enter PIN code';
    if (!RegExp(r'^\d{6}$').hasMatch(v.trim())) {
      return 'PIN code must be 6 digits';
    }
    return null;
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

            // ── Delivery Address ───────────────────────────────────────────
            _sectionTitle('Delivery Address'),
            const SizedBox(height: 12),

            if (_loadingAddresses)
              _addressLoadingShimmer()
            else ...[
              // 1. Use current location (always first)
              _currentLocationCard(),

              // 2. Saved profile addresses (if any)
              ..._savedAddresses
                  .asMap()
                  .entries
                  .map((e) => _savedAddressCard(e.key, e.value)),

              // 3. Add a new address
              _addNewAddressTile(),

              // 4. Inline form (auto-detect / new / editing)
              AnimatedSize(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                child: _showManualForm
                    ? _addressForm()
                    : const SizedBox.shrink(),
              ),

              // 5. Green summary for a chosen saved address
              if (_selectedAddrIdx != null &&
                  _selectedAddrIdx! >= 0 &&
                  !_isEditingSelected) ...[
                const SizedBox(height: 8),
                _savedAddressPreview(
                    _savedAddresses[_selectedAddrIdx!]),
              ],
            ],

            const SizedBox(height: 24),

            // ── Payment ────────────────────────────────────────────────────
            _sectionTitle('Payment Method'),
            const SizedBox(height: 10),
            _paymentTile('COD', 'Cash on Delivery', Icons.money),
            _paymentTile('ONLINE', 'Online Payment', Icons.credit_card),

            const SizedBox(height: 24),

            // ── Delivery Speed ─────────────────────────────────────────────
            _sectionTitle('Delivery Speed'),
            const SizedBox(height: 10),
            _deliveryTile('STANDARD', 'Standard Delivery', 'Free • 3-5 days',
                Icons.local_shipping_outlined),
            _deliveryTile(
                'EXPRESS', 'Express Delivery', '₹50 • 1-2 days', Icons.flash_on),

            const SizedBox(height: 24),

            // ── Coupon ─────────────────────────────────────────────────────
            _sectionTitle('Apply Coupon'),
            const SizedBox(height: 10),

            if (!_loadingCoupons && _availableCoupons.isNotEmpty) ...[
              Text('Available coupons:',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: _availableCoupons.map((c) {
                  final code = c['code'] as String? ?? '';
                  final desc = c['description'] as String? ?? '';
                  return GestureDetector(
                    onTap: () => _applyCouponFromList(code),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(code,
                            style: TextStyle(
                                color: Colors.blue.shade800,
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                        if (desc.isNotEmpty)
                          Text(desc,
                              style: TextStyle(
                                  color: Colors.blue.shade600, fontSize: 10)),
                      ]),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
            ],

            if (!_couponApplied)
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _couponCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      labelText: 'Enter coupon code',
                      prefixIcon: const Icon(Icons.local_offer_outlined),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 14),
                    ),
                    onSubmitted: (_) => _validateCoupon(),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10))),
                    onPressed: _validatingCoupon ? null : _validateCoupon,
                    child: _validatingCoupon
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : const Text('Apply'),
                  ),
                ),
              ])
            else
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.green.shade300)),
                child: Row(children: [
                  Icon(Icons.check_circle,
                      color: Colors.green.shade600, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                    Text(_appliedCouponCode ?? '',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade800)),
                    Text('You save ₹${_couponDiscount.toStringAsFixed(2)}',
                        style: TextStyle(
                            fontSize: 12, color: Colors.green.shade700)),
                  ])),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey, size: 20),
                    onPressed: _removeCoupon,
                    tooltip: 'Remove coupon',
                  ),
                ]),
              ),

            if (_couponMessage.isNotEmpty && !_couponApplied)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_couponMessage,
                    style:
                        TextStyle(color: Colors.red.shade700, fontSize: 12)),
              ),

            const SizedBox(height: 24),

            // ── Order Summary ──────────────────────────────────────────────
            _sectionTitle('Order Summary'),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200)),
              child: Column(children: [
                _summaryRow(
                    'Cart Total', '₹${widget.cartTotal.toStringAsFixed(2)}'),
                const SizedBox(height: 6),
                _summaryRow(
                    'Delivery',
                    deliveryCharge == 0
                        ? 'FREE'
                        : '₹${deliveryCharge.toStringAsFixed(2)}',
                    valueColor:
                        deliveryCharge == 0 ? Colors.green.shade700 : null),
                if (_couponApplied && _couponDiscount > 0) ...[
                  const SizedBox(height: 6),
                  _summaryRow(
                      'Coupon (${_appliedCouponCode ?? ''})',
                      '- ₹${_couponDiscount.toStringAsFixed(2)}',
                      valueColor: Colors.green.shade700),
                ],

                // ── GST / Tax Breakdown ────────────────────────────────────
                if (_gstBreakdown != null) ...[
                  const Divider(height: 20),
                  // Toggle header
                  GestureDetector(
                    onTap: () => setState(() => _showGst = !_showGst),
                    child: Row(children: [
                      Icon(Icons.receipt_long_outlined,
                          size: 15, color: Colors.orange.shade700),
                      const SizedBox(width: 6),
                      Text('GST / Tax Details',
                          style: TextStyle(
                              fontSize: 13,
                              color: Colors.orange.shade800,
                              fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Icon(
                        _showGst
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        size: 18,
                        color: Colors.orange.shade700,
                      ),
                    ]),
                  ),
                  if (_showGst) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange.shade100)),
                      child: Column(children: [
                        // Per-slab rows
                        ..._gstBreakdown!.slabs.map((slab) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Row(children: [
                                Text(
                                  'GST ${slab.slabPercent}%'
                                  ' (CGST ${slab.slabPercent ~/ 2}%'
                                  ' + SGST ${slab.slabPercent ~/ 2}%)',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.orange.shade800),
                                ),
                                const Spacer(),
                                Text(
                                  '₹${slab.totalTax.toStringAsFixed(2)}',
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.orange.shade800),
                                ),
                              ]),
                            )),
                        const Divider(height: 10),
                        Row(children: [
                          Text('Total Tax',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.orange.shade900)),
                          const Spacer(),
                          Text(
                            '₹${_gstBreakdown!.totalTax.toStringAsFixed(2)}',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange.shade900),
                          ),
                        ]),
                        if (_gstBreakdown!.isEstimate)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '* Estimated at 18% standard rate',
                              style: TextStyle(
                                  fontSize: 10, color: Colors.grey[500]),
                            ),
                          ),
                      ]),
                    ),
                  ],
                ] else if (_loadingGst)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(children: [
                      SizedBox(
                          width: 12, height: 12,
                          child: CircularProgressIndicator(
                              strokeWidth: 1.5,
                              color: Colors.orange.shade400)),
                      const SizedBox(width: 8),
                      Text('Loading tax breakdown…',
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey[500])),
                    ]),
                  ),

                const Divider(height: 16),
                _summaryRow('Grand Total', '₹${grandTotal.toStringAsFixed(2)}',
                    bold: true, valueColor: Colors.blue.shade700),
              ]),
            ),

            const SizedBox(height: 28),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: placing ? null : _placeOrder,
                style: ElevatedButton.styleFrom(
                    backgroundColor: paymentMode == 'ONLINE'
                        ? Colors.deepPurple.shade700
                        : Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12))),
                child: placing
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2.5))
                    : Row(mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            paymentMode == 'ONLINE'
                                ? Icons.lock_outline
                                : Icons.shopping_bag_outlined,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            paymentMode == 'ONLINE'
                                ? 'Pay ₹${grandTotal.toStringAsFixed(2)} Securely'
                                : 'Place Order • ₹${grandTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ]),
              ),
            ),
            const SizedBox(height: 20),
          ]),
        ),
      ),
    );
  }

  // ── Address widgets ───────────────────────────────────────────────────────

  Widget _addressLoadingShimmer() {
    return Column(children: List.generate(
        2,
        (i) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              height: 66,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child:
                  const Center(child: CircularProgressIndicator(strokeWidth: 2)),
            )));
  }

  /// "Use current location" — always the first card.
  Widget _currentLocationCard() {
    final isSelected  = _selectedAddrIdx == -1 && !_isEditingSelected;
    final isDetecting = isSelected && _detectingLocation;
    final isDetected  = isSelected && !_detectingLocation && !_detectFailed &&
        _detectedLabel.isNotEmpty;
    final isFailed    = isSelected && _detectFailed;

    return GestureDetector(
      onTap: _selectDetectLocation,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: isSelected ? Colors.blue.shade400 : Colors.grey.shade200,
              width: isSelected ? 2 : 1),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Row(children: [
          Icon(
            isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
            color:
                isSelected ? Colors.blue.shade700 : Colors.grey.shade400,
            size: 20,
          ),
          const SizedBox(width: 10),

          // Animated GPS icon / spinner
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: isDetecting
                ? SizedBox(
                    key: const ValueKey('spinner'),
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.blue.shade600))
                : Icon(
                    key: const ValueKey('gps'),
                    isDetected ? Icons.my_location : Icons.location_searching,
                    color: isDetected
                        ? Colors.blue.shade700
                        : isSelected
                            ? Colors.blue.shade400
                            : Colors.grey.shade500,
                    size: 20,
                  ),
          ),
          const SizedBox(width: 8),

          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
            Text('Use current location',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: isSelected
                        ? Colors.blue.shade800 : Colors.black87)),
            if (isDetecting)
              Text('Detecting your location…',
                  style: TextStyle(
                      fontSize: 11, color: Colors.blue.shade400))
            else if (isDetected)
              Text(_detectedLabel,
                  style: TextStyle(
                      fontSize: 11, color: Colors.blue.shade600))
            else if (isFailed)
              Text('Could not detect — enter manually below',
                  style: TextStyle(
                      fontSize: 11, color: Colors.orange.shade700))
            else
              Text('Tap to auto-fill city, state & PIN',
                  style: TextStyle(
                      fontSize: 11, color: Colors.grey.shade500)),
          ])),

          // Retry icon shown only after a failure
          if (isFailed)
            IconButton(
              onPressed: _autoDetectLocation,
              icon: Icon(Icons.refresh, size: 18, color: Colors.blue.shade600),
              tooltip: 'Retry',
              style: IconButton.styleFrom(
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.all(6)),
            ),
        ]),
      ),
    );
  }

  /// A card for a saved profile address.
  Widget _savedAddressCard(int idx, Map<String, dynamic> addr) {
    final isSelected = _selectedAddrIdx == idx && !_isEditingSelected;
    final name   = (addr['recipientName'] ?? 'Address ${idx + 1}') as String;
    final street = (addr['houseStreet']   ?? '') as String;
    final city   = (addr['city']           ?? '') as String;
    final state  = (addr['state']          ?? '') as String;
    final pin    = (addr['postalCode']     ?? '') as String;

    return GestureDetector(
      onTap: () => _selectSavedAddress(idx),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: isSelected ? Colors.blue.shade400 : Colors.grey.shade200,
              width: isSelected ? 2 : 1),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(
              isSelected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_off,
              color: isSelected
                  ? Colors.blue.shade700 : Colors.grey.shade400,
              size: 20,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
            Row(children: [
              Icon(Icons.location_on,
                  size: 14,
                  color: isSelected
                      ? Colors.blue.shade600 : Colors.grey.shade400),
              const SizedBox(width: 4),
              Expanded(
                  child: Text(name,
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: isSelected
                              ? Colors.blue.shade800 : Colors.black87))),
            ]),
            const SizedBox(height: 3),
            Text(
              [
                if (street.isNotEmpty) street,
                if (city.isNotEmpty || state.isNotEmpty)
                  [city, state].where((s) => s.isNotEmpty).join(', '),
                if (pin.isNotEmpty) pin,
              ].join(', '),
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ])),

          // Edit icon — only on the selected card
          if (isSelected)
            IconButton(
              onPressed: _startEditingSelected,
              icon: Icon(Icons.edit_outlined,
                  size: 18, color: Colors.blue.shade600),
              tooltip: 'Edit',
              style: IconButton.styleFrom(
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.all(6)),
            ),
        ]),
      ),
    );
  }

  /// "Add a new address" tile.
  Widget _addNewAddressTile() {
    final isSelected = _selectedAddrIdx == null;
    return GestureDetector(
      onTap: _selectNewAddress,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: isSelected ? Colors.blue.shade400 : Colors.grey.shade200,
              width: isSelected ? 2 : 1),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Row(children: [
          Icon(
              isSelected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_off,
              color: isSelected
                  ? Colors.blue.shade700 : Colors.grey.shade400,
              size: 20),
          const SizedBox(width: 10),
          Icon(Icons.add_location_alt_outlined,
              color: isSelected
                  ? Colors.blue.shade700 : Colors.grey.shade500,
              size: 20),
          const SizedBox(width: 8),
          Text('Add a new address',
              style: TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                  color: isSelected
                      ? Colors.blue.shade800 : Colors.black87)),
        ]),
      ),
    );
  }

  /// Inline form — shown for auto-detect / new address / editing saved.
  Widget _addressForm() {
    final isEditing    = _isEditingSelected &&
        _selectedAddrIdx != null &&
        _selectedAddrIdx! >= 0;
    final isAutoDetect = _selectedAddrIdx == -1;
    final locked       = _locationLocked;

    return Container(
      margin: const EdgeInsets.only(top: 4, bottom: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

        // ── Header ────────────────────────────────────────────────────────
        Row(children: [
          Icon(
            isAutoDetect
                ? Icons.my_location
                : isEditing
                    ? Icons.edit_location_alt_outlined
                    : Icons.add_location_alt_outlined,
            color: Colors.blue.shade700,
            size: 18,
          ),
          const SizedBox(width: 6),
          Text(
            isAutoDetect
                ? 'Confirm delivery details'
                : isEditing
                    ? 'Editing address'
                    : 'New Delivery Address',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: Colors.blue.shade800),
          ),
          const Spacer(),
          if (isEditing)
            GestureDetector(
              onTap: _cancelEditingSelected,
              child: Text('Cancel',
                  style:
                      TextStyle(fontSize: 12, color: Colors.blue.shade600)),
            ),
        ]),

        // ── Auto-detect success banner ─────────────────────────────────────
        if (isAutoDetect && locked) ...[
          const SizedBox(height: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(children: [
              Icon(Icons.check_circle_outline,
                  size: 14, color: Colors.blue.shade700),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Location detected: $_detectedLabel',
                  style: TextStyle(
                      fontSize: 11, color: Colors.blue.shade700),
                ),
              ),
            ]),
          ),
        ],

        const SizedBox(height: 12),

        // ── Recipient name ────────────────────────────────────────────────
        _addressField(
            controller: _recipientNameCtrl,
            label: 'Recipient Name',
            hint: 'e.g. Rahul Sharma',
            icon: Icons.person_outline,
            validator: (v) => _required(v, 'recipient name')),
        const SizedBox(height: 12),

        // ── Street ────────────────────────────────────────────────────────
        _addressField(
            controller: _houseStreetCtrl,
            label: 'House No. / Street / Area',
            hint: 'e.g. 12B, MG Road, Indiranagar',
            icon: Icons.home_outlined,
            validator: (v) => _required(v, 'street address')),
        const SizedBox(height: 12),

        // ── City + State ──────────────────────────────────────────────────
        Row(children: [
          Expanded(
              child: _addressField(
                  controller: _cityCtrl,
                  label: 'City',
                  hint: 'e.g. Bengaluru',
                  icon: Icons.location_city_outlined,
                  readOnly: locked,
                  validator: (v) => _required(v, 'city'))),
          const SizedBox(width: 12),
          Expanded(
              child: _addressField(
                  controller: _stateCtrl,
                  label: 'State',
                  hint: 'e.g. Karnataka',
                  icon: Icons.map_outlined,
                  readOnly: locked,
                  validator: (v) => _required(v, 'state'))),
        ]),
        const SizedBox(height: 12),

        // ── PIN Code ──────────────────────────────────────────────────────
        _addressField(
            controller: _pinCtrl,
            label: 'PIN Code',
            hint: 'e.g. 560001',
            icon: Icons.pin_drop_outlined,
            keyboardType: TextInputType.number,
            readOnly: locked,
            inputFormatters: locked
                ? []
                : [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
            validator: _validatePin),

        // Live preview
        _AddressPreview(
            nameCtrl: _recipientNameCtrl,
            streetCtrl: _houseStreetCtrl,
            cityCtrl: _cityCtrl,
            stateCtrl: _stateCtrl,
            pinCtrl: _pinCtrl),
      ]),
    );
  }

  /// Green confirmation banner below a chosen saved address.
  Widget _savedAddressPreview(Map<String, dynamic> addr) {
    final name   = (addr['recipientName'] ?? '') as String;
    final street = (addr['houseStreet']   ?? '') as String;
    final city   = (addr['city']           ?? '') as String;
    final state  = (addr['state']          ?? '') as String;
    final pin    = (addr['postalCode']     ?? '') as String;

    final parts = [
      if (name.isNotEmpty)   name,
      if (street.isNotEmpty) street,
      if (city.isNotEmpty || state.isNotEmpty)
        [city, state].where((s) => s.isNotEmpty).join(', '),
      if (pin.isNotEmpty) pin,
    ];
    if (parts.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.green.shade200)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.location_on, color: Colors.green.shade700, size: 18),
        const SizedBox(width: 8),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
          Text('Delivering to:',
              style: TextStyle(
                  fontSize: 11,
                  color: Colors.green.shade700,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 3),
          Text(parts.join(', '), style: const TextStyle(fontSize: 12)),
        ])),
      ]),
    );
  }

  // ── Reusable widgets ──────────────────────────────────────────────────────

  Widget _sectionTitle(String t) => Text(t,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold));

  Widget _addressField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    bool readOnly = false,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      validator: validator,
      readOnly: readOnly,
      style: TextStyle(color: readOnly ? Colors.grey.shade600 : null),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: readOnly
            ? Icon(Icons.lock_outline,
                size: 16, color: Colors.grey.shade400)
            : null,
        filled: readOnly,
        fillColor: readOnly ? Colors.grey.shade100 : null,
        border:
            OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }

  Widget _paymentTile(String value, String label, IconData icon) {
    final sel = paymentMode == value;
    return GestureDetector(
      onTap: () => setState(() => paymentMode = value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
            color: sel ? Colors.blue.shade50 : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color:
                    sel ? Colors.blue.shade400 : Colors.grey.shade200,
                width: sel ? 2 : 1)),
        child: Row(children: [
          Icon(icon,
              color: sel ? Colors.blue.shade700 : Colors.grey, size: 22),
          const SizedBox(width: 12),
          Text(label,
              style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color:
                      sel ? Colors.blue.shade800 : Colors.black87)),
          const Spacer(),
          Icon(
              sel
                  ? Icons.radio_button_checked
                  : Icons.radio_button_off,
              color: sel ? Colors.blue.shade700 : Colors.grey,
              size: 20),
        ]),
      ),
    );
  }

  Widget _deliveryTile(
      String value, String label, String sub, IconData icon) {
    final sel = deliveryTime == value;
    return GestureDetector(
      onTap: () => setState(() => deliveryTime = value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
            color: sel ? Colors.blue.shade50 : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color:
                    sel ? Colors.blue.shade400 : Colors.grey.shade200,
                width: sel ? 2 : 1)),
        child: Row(children: [
          Icon(icon,
              color: sel ? Colors.blue.shade700 : Colors.grey, size: 22),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,
                style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: sel
                        ? Colors.blue.shade800 : Colors.black87)),
            Text(sub,
                style: TextStyle(
                    fontSize: 12, color: Colors.grey.shade600)),
          ]),
          const Spacer(),
          Icon(
              sel
                  ? Icons.radio_button_checked
                  : Icons.radio_button_off,
              color: sel ? Colors.blue.shade700 : Colors.grey,
              size: 20),
        ]),
      ),
    );
  }

  Widget _summaryRow(String label, String value,
      {bool bold = false, Color? valueColor}) {
    return Row(children: [
      Text(label,
          style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.normal,
              fontSize: bold ? 15 : 14)),
      const Spacer(),
      Text(value,
          style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.w500,
              fontSize: bold ? 15 : 14,
              color: valueColor)),
    ]);
  }
}

// ── Live Address Preview ──────────────────────────────────────────────────────

class _AddressPreview extends StatefulWidget {
  final TextEditingController nameCtrl, streetCtrl, cityCtrl, stateCtrl,
      pinCtrl;
  const _AddressPreview({
    required this.nameCtrl,
    required this.streetCtrl,
    required this.cityCtrl,
    required this.stateCtrl,
    required this.pinCtrl,
  });

  @override
  State<_AddressPreview> createState() => _AddressPreviewState();
}

class _AddressPreviewState extends State<_AddressPreview> {
  void _rebuild() => setState(() {});

  @override
  void initState() {
    super.initState();
    for (final c in [
      widget.nameCtrl, widget.streetCtrl, widget.cityCtrl,
      widget.stateCtrl, widget.pinCtrl,
    ]) { c.addListener(_rebuild); }
  }

  @override
  void dispose() {
    for (final c in [
      widget.nameCtrl, widget.streetCtrl, widget.cityCtrl,
      widget.stateCtrl, widget.pinCtrl,
    ]) { c.removeListener(_rebuild); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final name   = widget.nameCtrl.text.trim();
    final street = widget.streetCtrl.text.trim();
    final city   = widget.cityCtrl.text.trim();
    final state  = widget.stateCtrl.text.trim();
    final pin    = widget.pinCtrl.text.trim();
    if ([name, street, city, state, pin].every((s) => s.isEmpty)) {
      return const SizedBox.shrink();
    }
    final parts = [
      if (name.isNotEmpty)   name,
      if (street.isNotEmpty) street,
      if (city.isNotEmpty || state.isNotEmpty)
        [city, state].where((s) => s.isNotEmpty).join(', '),
      if (pin.isNotEmpty) pin,
    ];
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.green.shade200)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.location_on, color: Colors.green.shade700, size: 18),
        const SizedBox(width: 8),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
          Text('Delivering to:',
              style: TextStyle(
                  fontSize: 11,
                  color: Colors.green.shade700,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 3),
          Text(parts.join(' • '),
              style: const TextStyle(fontSize: 12)),
        ])),
      ]),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Razorpay WebView Screen
// Opens a minimal in-app browser that loads the Razorpay checkout JS SDK.
// On payment success, closes and returns the payment credentials.
// On failure or back-press, returns null (caller stays on checkout).
// ══════════════════════════════════════════════════════════════════════════════

class _RazorpayWebViewScreen extends StatefulWidget {
  final String keyId;
  final String razorpayOrderId;
  final int    amount;      // paise
  final String currency;
  final String customerName;
  final String customerEmail;
  final String description;

  const _RazorpayWebViewScreen({
    required this.keyId,
    required this.razorpayOrderId,
    required this.amount,
    required this.currency,
    required this.customerName,
    required this.customerEmail,
    required this.description,
  });

  @override
  State<_RazorpayWebViewScreen> createState() => _RazorpayWebViewScreenState();
}

class _RazorpayWebViewScreenState extends State<_RazorpayWebViewScreen> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (msg) {
          // Message format: {"success":true,"razorpay_order_id":...,"razorpay_payment_id":...,"razorpay_signature":...}
          // or:             {"success":false,"error":"..."}
          try {
            final data = jsonDecode(msg.message) as Map<String, dynamic>;
            if (!mounted) return;
            if (data['success'] == true) {
              Navigator.pop<Map<String, String>>(context, {
                'razorpay_order_id':   data['razorpay_order_id'] ?? '',
                'razorpay_payment_id': data['razorpay_payment_id'] ?? '',
                'razorpay_signature':  data['razorpay_signature'] ?? '',
              });
            } else {
              Navigator.pop(context, null);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(data['error']?.toString() ?? 'Payment failed'),
                  backgroundColor: Colors.red,
                  behavior: SnackBarBehavior.floating,
                ));
              }
            }
          } catch (_) {
            if (mounted) Navigator.pop(context, null);
          }
        },
      )
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() => _loading = true),
        onPageFinished: (_) => setState(() => _loading = false),
      ))
      ..loadHtmlString(_buildHtml());
  }

  String _buildHtml() {
    final name  = widget.customerName.replaceAll("'", "\\'");
    final email = widget.customerEmail.replaceAll("'", "\\'");
    final desc  = widget.description.replaceAll("'", "\\'");

    return '''<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; display:flex; align-items:center;
           justify-content:center; min-height:100vh; margin:0;
           background: #f3f4f6; }
    .card { background:#fff; border-radius:16px; padding:32px 24px;
            text-align:center; box-shadow:0 4px 24px rgba(0,0,0,.08);
            max-width:360px; width:90%; }
    h2 { color:#1d4ed8; margin:0 0 8px; font-size:20px; }
    p  { color:#6b7280; margin:0 0 24px; font-size:14px; }
    .amount { font-size:28px; font-weight:700; color:#111827; margin-bottom:24px; }
    button { background:#1d4ed8; color:#fff; border:none; border-radius:10px;
             padding:14px 32px; font-size:16px; font-weight:600; cursor:pointer;
             width:100%; }
    button:hover { background:#1e40af; }
    .loader { color:#6b7280; font-size:13px; margin-top:12px; }
  </style>
</head>
<body>
<div class="card">
  <h2>💳 Ekart Checkout</h2>
  <p>$desc</p>
  <div class="amount">₹${(widget.amount / 100).toStringAsFixed(2)}</div>
  <button onclick="startPayment()">Pay Now</button>
  <div class="loader" id="msg"></div>
</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
function startPayment() {
  document.getElementById('msg').innerText = 'Opening payment gateway…';
  var options = {
    key:      '${widget.keyId}',
    amount:   ${widget.amount},
    currency: '${widget.currency}',
    order_id: '${widget.razorpayOrderId}',
    name:     'Ekart',
    description: '$desc',
    prefill: { name: '$name', email: '$email' },
    theme:   { color: '#1d4ed8' },
    handler: function(response) {
      FlutterChannel.postMessage(JSON.stringify({
        success: true,
        razorpay_order_id:   response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature:  response.razorpay_signature
      }));
    },
    modal: {
      ondismiss: function() {
        FlutterChannel.postMessage(JSON.stringify({
          success: false,
          error: 'Payment cancelled by user'
        }));
      }
    }
  };
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function(resp) {
    FlutterChannel.postMessage(JSON.stringify({
      success: false,
      error: resp.error.description || 'Payment failed'
    }));
  });
  rzp.open();
}
window.onload = function() { startPayment(); };
</script>
</body>
</html>''';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Payment'),
        backgroundColor: Colors.deepPurple.shade700,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context, null),
          tooltip: 'Cancel',
        ),
      ),
      body: Stack(children: [
        WebViewWidget(controller: _controller),
        if (_loading)
          Container(
            color: Colors.white,
            child: const Center(
              child: Column(mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Loading payment gateway…',
                    style: TextStyle(color: Colors.grey)),
              ]),
            ),
          ),
      ]),
    );
  }
}