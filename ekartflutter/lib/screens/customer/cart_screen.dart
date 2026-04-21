import 'package:flutter/material.dart';
import '../../models/cart_item_model.dart';
import '../../services/services.dart';
import '../../services/gst_service.dart';
import '../../services/activity_service.dart';
import 'checkout_screen.dart';

class CartScreen extends StatefulWidget {
  final Function(int)? onCartChanged;
  const CartScreen({super.key, this.onCartChanged});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> with AutomaticKeepAliveClientMixin {
  List<CartItem> items       = [];
  double subtotal            = 0;
  double couponDiscount      = 0;
  double deliveryCharge      = 0;
  double total               = 0;
  bool   loading             = true;
  String? errorMsg;

  // Coupon state
  bool   couponApplied       = false;
  String couponCode          = '';
  bool   couponLoading       = false;
  final couponCtrl           = TextEditingController();

  // GST breakdown
  GstBreakdown? _gstBreakdown;
  bool          _showGst     = false;

  final Set<int> _deleting = {};
  final Set<int> _updating = {};

  static const double _freeDeliveryThreshold = 500.0;
  static const double _deliveryFee           = 40.0;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadCart();
    ActivityService.pageView('cart');
  }

  @override
  void dispose() { couponCtrl.dispose(); super.dispose(); }

  Future<void> _loadCart() async {
    setState(() { loading = true; errorMsg = null; });
    try {
      final res = await CartService.getCart();
      if (!mounted) return;
      if (res['success'] == true || res.containsKey('items')) {
        final rawItems = res['items'] as List? ?? [];
        setState(() {
          items          = rawItems.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
          subtotal       = (res['subtotal']       ?? res['total'] ?? 0).toDouble();
          couponDiscount = (res['couponDiscount']  ?? 0).toDouble();
          deliveryCharge = (res['deliveryCharge']  ?? 0).toDouble();
          total          = (res['total']           ?? 0).toDouble();
          couponApplied  =  res['couponApplied']   == true;
          couponCode     =  res['couponCode']       as String? ?? '';
          if (couponApplied && couponCode.isNotEmpty) couponCtrl.text = couponCode;
          loading = false;
        });
        // Load GST breakdown silently after items are ready
        _loadGst();
      } else {
        setState(() { items = []; total = 0; loading = false; errorMsg = res['message']?.toString(); });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() { loading = false; errorMsg = 'Failed to load cart: $e'; });
    }
    widget.onCartChanged?.call(items.length);
  }

  Future<void> _loadGst() async {
    final cartTotal = total > 0 ? total : subtotal;
    if (cartTotal <= 0) return;
    final breakdown = await GstService.getCartGst(cartTotal);
    if (!mounted) return;
    setState(() => _gstBreakdown = breakdown);
  }

  double _computeSubtotal() => items.fold(0.0, (s, i) => s + i.price);

  void _recalcLocally() {
    subtotal        = _computeSubtotal();
    double discSub  = (subtotal - couponDiscount).clamp(0.0, double.infinity);
    deliveryCharge  = discSub >= _freeDeliveryThreshold ? 0.0 : (discSub == 0 ? 0.0 : _deliveryFee);
    total           = discSub + deliveryCharge;
  }

  bool _isBusy(int pid) => _deleting.contains(pid) || _updating.contains(pid);

  void _incrementQty(CartItem item) {
    if (_isBusy(item.productId)) return;
    setState(() { _updating.add(item.productId); item.quantity++; _recalcLocally(); });
    widget.onCartChanged?.call(items.length);
    CartService.updateCart(item.productId, item.quantity)
        .then((_) { if (mounted) setState(() => _updating.remove(item.productId)); });
  }

  void _decrementQty(CartItem item) {
    if (_isBusy(item.productId)) return;
    if (item.quantity > 1) {
      setState(() { _updating.add(item.productId); item.quantity--; _recalcLocally(); });
      CartService.updateCart(item.productId, item.quantity)
          .then((_) { if (mounted) setState(() => _updating.remove(item.productId)); });
    } else {
      _removeItem(item);
    }
  }

  Future<void> _removeItem(CartItem item) async {
    if (_isBusy(item.productId)) return;
    final idx = items.indexWhere((i) => i.productId == item.productId);
    if (idx == -1) return;
    final removed = items[idx];
    setState(() { _deleting.add(item.productId); items.removeAt(idx); _recalcLocally(); });
    widget.onCartChanged?.call(items.length);
    final res = await CartService.removeFromCart(item.productId);
    if (!mounted) return;
    if (res['success'] != true) {
      setState(() { items.insert(idx, removed); _recalcLocally(); });
      widget.onCartChanged?.call(items.length);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['message'] ?? 'Failed to remove item'),
          backgroundColor: Colors.red, behavior: SnackBarBehavior.floating));
    }
    setState(() => _deleting.remove(item.productId));
  }

  // ── Coupon ────────────────────────────────────────────────────────────────

  Future<void> _applyCoupon() async {
    final code = couponCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() => couponLoading = true);
    final res = await CouponService.applyCoupon(code);
    if (!mounted) return;
    setState(() => couponLoading = false);
    if (res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['message'] ?? 'Coupon applied!'),
          backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
      _loadCart();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['message'] ?? 'Invalid coupon'),
          backgroundColor: Colors.red, behavior: SnackBarBehavior.floating));
    }
  }

  Future<void> _removeCoupon() async {
    setState(() => couponLoading = true);
    await CouponService.removeCoupon();
    if (!mounted) return;
    couponCtrl.clear();
    _loadCart();
  }

  void _showCouponPicker() async {
    final coupons = await CouponService.getActiveCoupons();
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CouponPickerSheet(
        coupons: coupons,
        onSelect: (code) { couponCtrl.text = code; _applyCoupon(); },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (loading) return const Center(child: CircularProgressIndicator());
    if (errorMsg != null) {
      return Center(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.wifi_off_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('Could not load cart', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text(errorMsg!, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey[400])),
          const SizedBox(height: 20),
          ElevatedButton.icon(onPressed: _loadCart, icon: const Icon(Icons.refresh), label: const Text('Retry'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white)),
        ]),
      ));
    }
    if (items.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.shopping_cart_outlined, size: 90, color: Colors.grey[300]),
        const SizedBox(height: 16),
        Text('Your cart is empty', style: TextStyle(fontSize: 18, color: Colors.grey[500])),
        const SizedBox(height: 8),
        Text('Add products to get started', style: TextStyle(color: Colors.grey[400])),
      ]));
    }
    return Column(children: [
      Expanded(
        child: RefreshIndicator(
          onRefresh: _loadCart,
          child: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              ...items.map(_buildCartItem),
              const SizedBox(height: 8),
              _buildFreeDeliveryBar(),
              const SizedBox(height: 12),
              _buildCouponSection(),
            ],
          ),
        ),
      ),
      _buildSummaryBar(),
    ]);
  }

  Widget _buildFreeDeliveryBar() {
    if (subtotal >= _freeDeliveryThreshold) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.green.shade50, borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.green.shade200)),
        child: Row(children: [
          Icon(Icons.local_shipping, color: Colors.green.shade700, size: 20),
          const SizedBox(width: 8),
          Text('You get FREE delivery!',
              style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w600)),
        ]),
      );
    }
    final needed   = _freeDeliveryThreshold - subtotal;
    final progress = (subtotal / _freeDeliveryThreshold).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.orange.shade200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.local_shipping_outlined, color: Colors.orange.shade700, size: 18),
          const SizedBox(width: 6),
          Expanded(child: Text(
            'Add \u20b9${needed.toStringAsFixed(0)} more for FREE delivery',
            style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.w600, fontSize: 13))),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress, minHeight: 6,
            backgroundColor: Colors.orange.shade100,
            valueColor: AlwaysStoppedAnimation<Color>(Colors.orange.shade600)),
        ),
      ]),
    );
  }

  Widget _buildCouponSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.08), blurRadius: 6, offset: const Offset(0, 2))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.local_offer_outlined, color: Colors.blue.shade700, size: 18),
          const SizedBox(width: 6),
          Text('Coupons & Offers', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade700)),
          const Spacer(),
          GestureDetector(onTap: _showCouponPicker,
              child: Text('Browse', style: TextStyle(color: Colors.blue.shade600, fontSize: 13, fontWeight: FontWeight.w600))),
        ]),
        const SizedBox(height: 10),
        if (couponApplied) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.shade50, borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade300)),
            child: Row(children: [
              Icon(Icons.check_circle, color: Colors.green.shade700, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(couponCode, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade800)),
                Text('Saving \u20b9${couponDiscount.toStringAsFixed(0)}',
                    style: TextStyle(fontSize: 12, color: Colors.green.shade700)),
              ])),
              couponLoading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : GestureDetector(onTap: _removeCoupon,
                      child: Icon(Icons.close, size: 18, color: Colors.grey[500])),
            ]),
          ),
        ] else ...[
          Row(children: [
            Expanded(child: TextField(
              controller: couponCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Enter coupon code',
                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: Colors.grey.shade300)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: Colors.blue.shade400))),
              onSubmitted: (_) => _applyCoupon(),
            )),
            const SizedBox(width: 8),
            couponLoading
                ? const SizedBox(width: 40, height: 40, child: Center(child: CircularProgressIndicator(strokeWidth: 2)))
                : ElevatedButton(
                    onPressed: _applyCoupon,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.bold))),
          ]),
        ],
      ]),
    );
  }

  Widget _buildSummaryBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.25), blurRadius: 10, offset: const Offset(0, -3))]),
      child: Column(children: [
        _summaryRow('Subtotal (${items.length} item${items.length == 1 ? '' : 's'})', '\u20b9${subtotal.toStringAsFixed(2)}'),
        if (couponDiscount > 0)
          _summaryRow('Coupon discount', '\u2212\u20b9${couponDiscount.toStringAsFixed(2)}', valueColor: Colors.green.shade700),
        _summaryRow('Delivery', deliveryCharge == 0 ? 'FREE' : '\u20b9${deliveryCharge.toStringAsFixed(2)}',
            valueColor: deliveryCharge == 0 ? Colors.green.shade700 : null),

        // ── GST / Tax Breakdown ──────────────────────────────────────────────
        if (_gstBreakdown != null) ...[
          const SizedBox(height: 4),
          GestureDetector(
            onTap: () => setState(() => _showGst = !_showGst),
            child: Row(children: [
              Icon(Icons.receipt_long_outlined,
                  size: 13, color: Colors.orange.shade700),
              const SizedBox(width: 4),
              Text('GST included',
                  style: TextStyle(
                      fontSize: 12,
                      color: Colors.orange.shade800,
                      fontWeight: FontWeight.w500)),
              const SizedBox(width: 4),
              Text('(₹${_gstBreakdown!.totalTax.toStringAsFixed(2)})',
                  style: TextStyle(
                      fontSize: 12, color: Colors.orange.shade700)),
              const Spacer(),
              Icon(
                _showGst
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                size: 16,
                color: Colors.orange.shade600,
              ),
            ]),
          ),
          if (_showGst) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade100)),
              child: Column(children: [
                ..._gstBreakdown!.slabs.map((slab) => Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Row(children: [
                        Text(
                          'GST ${slab.slabPercent}%'
                          ' (CGST ${slab.slabPercent ~/ 2}%'
                          ' + SGST ${slab.slabPercent ~/ 2}%)',
                          style: TextStyle(
                              fontSize: 11, color: Colors.orange.shade800),
                        ),
                        const Spacer(),
                        Text('₹${slab.totalTax.toStringAsFixed(2)}',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.orange.shade800)),
                      ]),
                    )),
                const Divider(height: 8),
                Row(children: [
                  Text('Total Tax',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange.shade900)),
                  const Spacer(),
                  Text('₹${_gstBreakdown!.totalTax.toStringAsFixed(2)}',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange.shade900)),
                ]),
                if (_gstBreakdown!.isEstimate)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text('* Estimated at 18% standard rate',
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey[500])),
                  ),
              ]),
            ),
          ],
        ],

        const Divider(height: 12),
        _summaryRow('Total', '\u20b9${total.toStringAsFixed(2)}', bold: true),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity, height: 50,
          child: ElevatedButton(
            onPressed: () async {
              await Navigator.push(context,
                  MaterialPageRoute(builder: (_) => CheckoutScreen(cartTotal: total)));
              _loadCart();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            child: const Text('Proceed to Checkout', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ),
      ]),
    );
  }

  Widget _summaryRow(String label, String value, {bool bold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: bold ? const TextStyle(fontWeight: FontWeight.bold) : TextStyle(color: Colors.grey[600])),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: Text(value, key: ValueKey(value),
              style: TextStyle(
                fontWeight: bold ? FontWeight.bold : FontWeight.normal,
                color: valueColor ?? (bold ? Colors.blue.shade700 : null),
                fontSize: bold ? 16 : 14)),
        ),
      ]),
    );
  }

  Widget _buildCartItem(CartItem item) {
    final busy       = _isBusy(item.productId);
    final isDeleting = _deleting.contains(item.productId);
    final isUpdating = _updating.contains(item.productId);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: item.imageLink.isNotEmpty
                ? Image.network(item.imageLink, width: 75, height: 75, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _imgBox())
                : _imgBox(),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 4),
            Text('\u20b9${item.unitPrice.toStringAsFixed(2)}',
                style: TextStyle(color: Colors.blue.shade700, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Row(children: [
              _qtyBtn(
                icon: item.quantity > 1 ? Icons.remove : Icons.delete_outline,
                color: busy ? Colors.grey[300]! : item.quantity > 1 ? Colors.grey.shade700 : Colors.red,
                onTap: busy ? null : () => _decrementQty(item)),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 150),
                transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                child: Container(
                  key: ValueKey(item.quantity),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(4)),
                  child: isUpdating
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
              _qtyBtn(icon: Icons.add, color: busy ? Colors.grey[300]! : Colors.grey.shade700, onTap: busy ? null : () => _incrementQty(item)),
              const Spacer(),
              isDeleting
                  ? const SizedBox(width: 36, height: 36,
                      child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))))
                  : IconButton(
                      icon: Icon(Icons.delete_outline, color: busy ? Colors.grey[300] : Colors.red),
                      onPressed: busy ? null : () => _removeItem(item)),
            ]),
            Text('Item total: \u20b9${item.price.toStringAsFixed(2)}',
                style: TextStyle(color: Colors.grey[500], fontSize: 12)),
          ])),
        ]),
      ),
    );
  }

  Widget _imgBox() => Container(width: 75, height: 75, color: Colors.grey[200], child: const Icon(Icons.image, color: Colors.grey));

  Widget _qtyBtn({required IconData icon, required Color color, required VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32, height: 32,
        decoration: BoxDecoration(
          border: Border.all(color: onTap == null ? Colors.grey[200]! : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(4)),
        child: Icon(icon, size: 18, color: color)),
    );
  }
}

// ── Coupon Picker Bottom Sheet ────────────────────────────────────────────────

class _CouponPickerSheet extends StatelessWidget {
  final List<Map<String, dynamic>> coupons;
  final void Function(String code)  onSelect;
  const _CouponPickerSheet({required this.coupons, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6, maxChildSize: 0.9, minChildSize: 0.4, expand: false,
      builder: (_, ctrl) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: Column(children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
          const Text('Available Coupons', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (coupons.isEmpty)
            const Padding(padding: EdgeInsets.all(32),
                child: Text('No coupons available right now.', style: TextStyle(color: Colors.grey), textAlign: TextAlign.center))
          else
            Expanded(child: ListView.separated(
              controller: ctrl, itemCount: coupons.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _CouponCard(coupon: coupons[i], onApply: () { Navigator.pop(context); onSelect(coupons[i]['code'] as String); }),
            )),
        ]),
      ),
    );
  }
}

class _CouponCard extends StatelessWidget {
  final Map<String, dynamic> coupon;
  final VoidCallback onApply;
  const _CouponCard({required this.coupon, required this.onApply});

  @override
  Widget build(BuildContext context) {
    final code        = coupon['code']          as String? ?? '';
    final description = coupon['description']   as String? ?? '';
    final typeLabel   = coupon['typeLabel']      as String? ?? '';
    final minOrder    = (coupon['minOrderAmount'] ?? 0).toDouble();
    final expiry      = coupon['expiryDate']     as String?;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
        boxShadow: [BoxShadow(color: Colors.blue.withValues(alpha: 0.06), blurRadius: 8)]),
      child: Row(children: [
        Container(width: 6, height: 90,
            decoration: BoxDecoration(color: Colors.blue.shade700,
                borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), bottomLeft: Radius.circular(12)))),
        const SizedBox(width: 12),
        Expanded(child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(6), border: Border.all(color: Colors.blue.shade200)),
                child: Text(code, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade800, letterSpacing: 1.2))),
              const SizedBox(width: 8),
              Text(typeLabel, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            ]),
            const SizedBox(height: 4),
            Text(description, style: const TextStyle(fontWeight: FontWeight.w500)),
            if (minOrder > 0) Text('Min. order \u20b9${minOrder.toStringAsFixed(0)}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            if (expiry != null) Text('Expires $expiry', style: TextStyle(color: Colors.grey[400], fontSize: 11)),
          ]),
        )),
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: ElevatedButton(
            onPressed: onApply,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            child: const Text('Apply')),
        ),
      ]),
    );
  }
}