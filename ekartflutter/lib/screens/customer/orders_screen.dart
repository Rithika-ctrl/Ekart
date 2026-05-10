import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/order_model.dart';
import '../../services/services.dart';
import '../../services/invoice_service.dart';
import '../../services/activity_service.dart';
import 'refunds_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order> orders     = [];
  bool        loading    = true;
  Set<int>    reordering = {};

  @override
  void initState() {
    super.initState();
    _load();
    ActivityService.pageView('orders');
  }

  Future<void> _load() async {
    setState(() => loading = true);
    final list = await OrderService.getOrders();
    if (!mounted) return;
    setState(() { orders = list.reversed.toList(); loading = false; });
  }

  Future<void> _cancel(int id) async {
    final res = await OrderService.cancelOrder(id);
    if (!mounted) return;
    _snack(
      res['success'] == true ? 'Order cancelled successfully' : res['message'] ?? 'Failed',
      res['success'] == true ? Colors.orange : Colors.red,
    );
    if (res['success'] == true) _load();
  }

  /// Reorder with stock pre-check: shows a breakdown before confirming.
  Future<void> _reorder(Order order) async {
    setState(() => reordering.add(order.id));

    // Fetch stock check from backend
    final checkRes = await OrderService.reorderStockCheck(order.id);
    setState(() => reordering.remove(order.id));
    if (!mounted) return;

    if (checkRes['success'] != true) {
      // Fallback: if endpoint doesn't exist, reorder directly
      _reorderDirect(order);
      return;
    }

    final items = List<Map<String, dynamic>>.from(checkRes['items'] ?? []);
    if (items.isEmpty) {
      _reorderDirect(order);
      return;
    }

    // Count items in each state
    final lowItems = items.where((i) => i['status'] == 'LOW').length;
    final oosItems = items.where((i) => i['status'] == 'OUT_OF_STOCK').toList();
    final canAdd   = items.where((i) => i['canAdd'] == true).length;

    // If all items OK, proceed without confirmation
    if (oosItems.isEmpty && lowItems == 0) {
      _reorderDirect(order);
      return;
    }

    // Show stock breakdown modal
    if (!mounted) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Icon(Icons.inventory_2_outlined, color: Colors.blue.shade700),
          const SizedBox(width: 8),
          const Text('Stock Check', style: TextStyle(fontSize: 18)),
        ]),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (oosItems.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200)),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Icon(Icons.warning_amber_rounded,
                      color: Colors.red.shade600, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${oosItems.length} item${oosItems.length == 1 ? '' : 's'} '
                      'out of stock: '
                      '${oosItems.map((i) => i['productName'] ?? 'Item').join(', ')}',
                      style: TextStyle(
                          color: Colors.red.shade700, fontSize: 13),
                    ),
                  ),
                ]),
              ),
            if (lowItems > 0)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade200)),
                child: Row(children: [
                  Icon(Icons.info_outline, color: Colors.amber.shade700, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('$lowItems item${lowItems == 1 ? '' : 's'} has limited stock',
                        style: TextStyle(color: Colors.amber.shade800, fontSize: 13)),
                  ),
                ]),
              ),
            // Per-item list
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 200),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: items.length,
                itemBuilder: (_, i) {
                  final item   = items[i];
                  final status = item['status'] as String? ?? 'OK';
                  final color  = status == 'OK'
                      ? Colors.green
                      : status == 'LOW'
                          ? Colors.amber.shade700
                          : Colors.red;
                  final icon   = status == 'OK'
                      ? Icons.check_circle_outline
                      : status == 'LOW'
                          ? Icons.warning_amber_outlined
                          : Icons.remove_circle_outline;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(children: [
                      Icon(icon, color: color, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(item['productName'] ?? 'Item',
                              style: const TextStyle(fontSize: 13))),
                      Text(
                        status == 'OUT_OF_STOCK'
                            ? 'Out of stock'
                            : 'Qty ${item['requestedQty'] ?? 1}',
                        style: TextStyle(fontSize: 12, color: color),
                      ),
                    ]),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Text(
              canAdd == 0
                  ? 'No items available to reorder right now.'
                  : '$canAdd of ${items.length} item${items.length == 1 ? '' : 's'} will be added to cart.',
              style: TextStyle(
                  fontSize: 13,
                  color: canAdd == 0 ? Colors.red.shade700 : Colors.grey[600]),
            ),
          ]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(_, false),
            child: const Text('Cancel'),
          ),
          if (canAdd > 0)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.shade700,
                  foregroundColor: Colors.white),
              onPressed: () => Navigator.pop(_, true),
              child: Text('Add $canAdd to Cart'),
            ),
        ],
      ),
    );

    if (confirmed == true) _reorderDirect(order);
  }

  Future<void> _reorderDirect(Order order) async {
    setState(() => reordering.add(order.id));
    final res = await OrderService.reorder(order.id);
    setState(() => reordering.remove(order.id));
    if (!mounted) return;
    if (res['success'] == true) {
      final added = res['addedCount'] ?? 0;
      final oos   = (res['outOfStockItems'] as List? ?? []).length;
      _snack('$added item(s) added to cart!${oos > 0 ? ' ($oos out of stock)' : ''}',
          Colors.green);
    } else {
      _snack(res['message'] ?? 'Reorder failed', Colors.red);
    }
  }

  void _snack(String msg, Color color) =>
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));

  // ── 7-day window helper ──────────────────────────────────────────────────

  /// Returns true if the order was delivered within the last 7 days.
  /// Falls back to false (disables actions) if deliveredAt is unavailable.
  bool _withinReturnWindow(Order order) {
    if (order.deliveredAt == null) return false;
    try {
      final delivered = DateTime.parse(order.deliveredAt!);
      return DateTime.now().difference(delivered).inDays < 7;
    } catch (_) {
      return false;
    }
  }

  /// Days remaining in the return window (0 if expired).
  int _daysRemaining(Order order) {
    if (order.deliveredAt == null) return 0;
    try {
      final delivered = DateTime.parse(order.deliveredAt!);
      final remaining = 7 - DateTime.now().difference(delivered).inDays;
      return remaining < 0 ? 0 : remaining;
    } catch (_) {
      return 0;
    }
  }

  // ── Live Tracking Sheet ──────────────────────────────────────────────────

  void _showTrackingSheet(Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LiveTrackingSheet(order: order),
    );
  }

  // ── Report Issue Sheet ───────────────────────────────────────────────────

  void _showReportIssueSheet(Order order) {
    final descCtrl   = TextEditingController();
    String? selectedReason;
    bool submitting = false;

    const reasons = [
      'Item not received',
      'Wrong item delivered',
      'Item damaged / defective',
      'Missing items in order',
      'Delivery delayed',
      'Other',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
              left: 20, right: 20, top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.report_problem_outlined, color: Colors.red.shade700),
              const SizedBox(width: 8),
              Text('Report Issue — Order #${order.id}',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ]),
            const SizedBox(height: 16),
            const Text('Reason', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: reasons.map((r) {
              final sel = selectedReason == r;
              return GestureDetector(
                onTap: () => setS(() => selectedReason = r),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: sel ? Colors.red.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: sel ? Colors.red.shade400 : Colors.grey.shade300,
                        width: 1.5)),
                  child: Text(r, style: TextStyle(
                      color: sel ? Colors.red.shade700 : Colors.grey[700],
                      fontWeight: sel ? FontWeight.w600 : FontWeight.normal,
                      fontSize: 13)),
                ),
              );
            }).toList()),
            const SizedBox(height: 14),
            const Text('Additional Details (optional)',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: descCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                  hintText: 'Describe the problem in detail...',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: submitting ? null : () async {
                  if (selectedReason == null) {
                    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                        content: Text('Please select a reason'),
                        backgroundColor: Colors.red));
                    return;
                  }
                  setS(() => submitting = true);
                  final nav       = Navigator.of(ctx);
                  final messenger = ScaffoldMessenger.of(context);
                  final res = await OrderService.reportIssue(order.id,
                      reason: selectedReason!, description: descCtrl.text.trim());
                  nav.pop();
                  messenger.showSnackBar(SnackBar(
                      content: Text(res['message'] ??
                          (res['success'] == true ? 'Issue reported!' : 'Failed')),
                      backgroundColor: res['success'] == true ? Colors.green : Colors.red,
                      behavior: SnackBarBehavior.floating));
                },
                icon: submitting
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send),
                label: Text(submitting ? 'Submitting…' : 'Submit Report'),
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10))),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // ── Refund / Replacement Sheet ────────────────────────────────────────────

  void _showRefundDialog(Order order) {
    String type = 'REFUND';
    final ctrl  = TextEditingController();
    bool submitting = false;
    showModalBottomSheet(
      context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
              left: 20, right: 20, top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Order #${order.id} — Request',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text('Type', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: _typeBtn(setS, type, 'REFUND',
                  Icons.currency_rupee, 'Refund', Colors.green,
                  () => setS(() => type = 'REFUND'))),
              const SizedBox(width: 10),
              Expanded(child: _typeBtn(setS, type, 'REPLACEMENT',
                  Icons.swap_horiz, 'Replacement', Colors.orange,
                  () => setS(() => type = 'REPLACEMENT'))),
            ]),
            const SizedBox(height: 16),
            const Text('Reason', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
                controller: ctrl, maxLines: 3,
                decoration: const InputDecoration(
                    hintText: 'Describe the issue...', border: OutlineInputBorder())),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: submitting ? null : () async {
                  if (ctrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                        content: Text('Please describe the issue'),
                        backgroundColor: Colors.red));
                    return;
                  }
                  setS(() => submitting = true);
                  final nav = Navigator.of(ctx);
                  final messenger = ScaffoldMessenger.of(context);
                  // Prepend the selected type so the backend knows whether
                  // this is a refund or a replacement request.
                  final res = await RefundService.requestRefund(
                      orderId: order.id,
                      reason: '[$type] ${ctrl.text.trim()}');
                  nav.pop();
                  messenger.showSnackBar(SnackBar(
                      content: Text(res['message'] ??
                          (res['success'] == true ? 'Request submitted!' : 'Failed')),
                      backgroundColor: res['success'] == true ? Colors.green : Colors.red,
                      behavior: SnackBarBehavior.floating));
                  if (res['success'] == true) _load();
                },
                icon: submitting
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send),
                label: Text(submitting ? 'Submitting...' : 'Submit Request'),
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10))),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // ── Review Sheet ─────────────────────────────────────────────────────────

  /// Shows a review bottom sheet.
  /// For bulk orders (qty > 1 or multiple items), each unique product gets
  /// its own rating card. The customer can dismiss without submitting.
  void _showReviewSheet(Order order) {
    // Collect unique unreviewed products from the order
    final items = order.items
        .where((i) => i.productId != null &&
            !order.reviewedProductIds.contains(i.productId))
        .fold<Map<int, OrderItem>>({}, (map, item) {
          map[item.productId!] = item;
          return map;
        })
        .values
        .toList();

    if (items.isEmpty) return; // all already reviewed

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReviewSheet(
        order: order,
        items: items,
        onSubmitted: () {
          _load(); // refresh so reviewed badges update
        },
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Widget _typeBtn(StateSetter setS, String current, String value,
      IconData icon, String label, Color color, VoidCallback onTap) {
    final sel = current == value;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
            color: sel ? color.withValues(alpha: 0.08) : Colors.white,
            border: Border.all(
                color: sel ? color : Colors.grey.shade300, width: 2),
            borderRadius: BorderRadius.circular(10)),
        child: Column(children: [
          Icon(icon, color: sel ? color : Colors.grey, size: 26),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(
              color: sel ? color : Colors.grey[600],
              fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'PROCESSING':       return Colors.orange;
      case 'PACKED':           return Colors.amber.shade700;
      case 'SHIPPED':          return Colors.blue;
      case 'OUT_FOR_DELIVERY': return Colors.purple;
      case 'DELIVERED':        return Colors.green;
      case 'CANCELLED':        return Colors.red;
      case 'REFUNDED':         return Colors.teal;
      default:                 return Colors.grey;
    }
  }

  IconData _statusIcon(String s) {
    switch (s) {
      case 'PROCESSING':       return Icons.hourglass_top;
      case 'PACKED':           return Icons.inventory_2;
      case 'SHIPPED':          return Icons.local_shipping;
      case 'OUT_FOR_DELIVERY': return Icons.delivery_dining;
      case 'DELIVERED':        return Icons.check_circle;
      case 'CANCELLED':        return Icons.cancel;
      case 'REFUNDED':         return Icons.currency_rupee;
      default:                 return Icons.receipt;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (orders.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center,
          children: [
        Icon(Icons.receipt_long, size: 90, color: Colors.grey[300]),
        const SizedBox(height: 16),
        Text('No orders yet', style: TextStyle(fontSize: 18, color: Colors.grey[500])),
      ]));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: orders.length,
        itemBuilder: (_, i) => _buildOrderCard(orders[i]),
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    final color       = _statusColor(order.trackingStatus);
    final isDelivered = order.trackingStatus == 'DELIVERED';
    final inWindow    = isDelivered && _withinReturnWindow(order);
    final daysLeft    = inWindow ? _daysRemaining(order) : 0;

    final canCancel   = order.trackingStatus == 'PROCESSING' ||
        order.trackingStatus == 'PACKED' ||
        order.trackingStatus == 'SHIPPED';
    // Refund/replacement only available if vendor allows returns AND within window.
    final canRefund   = isDelivered && inWindow && !order.replacementRequested
        && order.hasRefundableItems;
    // Allow reporting for any non-cancelled order.
    // For delivered orders specifically, gate it within the 7-day return window.
    final canReport   = order.trackingStatus != 'CANCELLED' &&
        (isDelivered ? inWindow : true);
    final canReorder  = isDelivered || order.trackingStatus == 'CANCELLED';
    final isInTransit = order.trackingStatus == 'PROCESSING' ||
        order.trackingStatus == 'PACKED'   ||
        order.trackingStatus == 'SHIPPED'  ||
        order.trackingStatus == 'OUT_FOR_DELIVERY';
    final isReordering = reordering.contains(order.id);

    // Unreviewed items (only if delivered)
    final unreviewedItems = isDelivered
        ? order.items.where((i) =>
            i.productId != null &&
            !order.reviewedProductIds.contains(i.productId)).toList()
        : <OrderItem>[];
    final canReview = isDelivered && unreviewedItems.isNotEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: CircleAvatar(
            backgroundColor: color.withValues(alpha: 0.15),
            child: Icon(_statusIcon(order.trackingStatus), color: color, size: 20)),
        title: Text('Order #${order.id}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(order.trackingStatusDisplay,
              style: TextStyle(color: color, fontWeight: FontWeight.w600)),
          Text('₹${order.totalPrice.toStringAsFixed(2)} • ${order.paymentMode}',
              style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ]),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [

              // ── Tracking bar ─────────────────────────────────────────────
              if (order.trackingStatus != 'CANCELLED' &&
                  order.trackingStatus != 'REFUNDED') ...[
                _buildTrackingBar(order),
                const SizedBox(height: 8),
              ],

              // ── Estimated delivery ────────────────────────────────────────
              if (isInTransit && order.estimatedDelivery != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.shade100)),
                  child: Row(children: [
                    Icon(Icons.schedule, size: 16, color: Colors.blue.shade700),
                    const SizedBox(width: 6),
                    Text('Estimated delivery: ',
                        style: TextStyle(color: Colors.blue.shade700, fontSize: 13)),
                    Text(_formatDate(order.estimatedDelivery!),
                        style: TextStyle(
                            color: Colors.blue.shade800,
                            fontWeight: FontWeight.bold, fontSize: 13)),
                  ]),
                ),
                const SizedBox(height: 10),
              ],

              // ── 7-day return window banner ────────────────────────────────
              if (isDelivered) ...[
                if (inWindow)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade200)),
                    child: Row(children: [
                      Icon(Icons.verified_user_outlined,
                          size: 16, color: Colors.green.shade700),
                      const SizedBox(width: 6),
                      Text(
                        daysLeft == 0
                            ? 'Last day to report / request refund'
                            : 'Return window: $daysLeft day${daysLeft == 1 ? '' : 's'} left',
                        style: TextStyle(
                            color: Colors.green.shade800,
                            fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ]),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300)),
                    child: Row(children: [
                      Icon(Icons.lock_outline, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 6),
                      Text('Return window expired (7 days)',
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 12)),
                    ]),
                  ),
                const SizedBox(height: 10),
              ],

              // ── Live tracking button ──────────────────────────────────────
              if (isInTransit) ...[
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showTrackingSheet(order),
                    icon: Icon(Icons.my_location, size: 18, color: Colors.blue.shade700),
                    label: Text('Live Tracking',
                        style: TextStyle(
                            color: Colors.blue.shade700, fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.blue.shade300),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // ── Items ─────────────────────────────────────────────────────
              const Text('Items', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...order.items.map((item) {
                final alreadyReviewed = order.reviewedProductIds.contains(item.productId);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(children: [
                    if (item.imageLink.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.network(item.imageLink,
                            width: 48, height: 48, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(width: 48, height: 48, color: Colors.grey[200])))
                    else
                      Container(width: 48, height: 48, color: Colors.grey[200]),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(item.name, style: const TextStyle(fontWeight: FontWeight.w500),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      Text('₹${item.price.toStringAsFixed(2)} × ${item.quantity}',
                          style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                      const SizedBox(height: 2),
                      // Return policy + reviewed badges
                      Row(children: [
                        Icon(
                          item.returnsAccepted
                              ? Icons.assignment_return_outlined
                              : Icons.block_outlined,
                          size: 11,
                          color: item.returnsAccepted
                              ? Colors.green.shade600
                              : Colors.red.shade400,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          item.returnsAccepted ? 'Returnable' : 'Non-returnable',
                          style: TextStyle(
                            fontSize: 10,
                            color: item.returnsAccepted
                                ? Colors.green.shade600
                                : Colors.red.shade400,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (isDelivered && alreadyReviewed) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.star_rounded, size: 11, color: Colors.amber.shade600),
                          const SizedBox(width: 2),
                          Text('Reviewed', style: TextStyle(
                              fontSize: 10, color: Colors.amber.shade700,
                              fontWeight: FontWeight.w500)),
                        ],
                      ]),
                    ])),
                    Text('₹${(item.price * item.quantity).toStringAsFixed(2)}',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, color: Colors.blue.shade700)),
                  ]),
                );
              }),

              const Divider(height: 20),
              _row('Subtotal', '₹${order.amount.toStringAsFixed(2)}'),
              _row('Delivery', order.deliveryCharge == 0
                  ? 'FREE' : '₹${order.deliveryCharge.toStringAsFixed(2)}'),
              _row('Total', '₹${order.totalPrice.toStringAsFixed(2)}', bold: true),

              if (order.currentCity != null && order.currentCity!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text('Location: ${order.currentCity}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                  ),
                ]),
              ],

              // FIX: show the immutable delivery destination (deliveryAddress)
              // which the backend now emits separately from currentCity.
              // currentCity is mutated as the order moves; deliveryAddress never changes.
              if (order.deliveryAddress != null &&
                  order.deliveryAddress!.isNotEmpty &&
                  order.deliveryAddress != order.currentCity) ...[
                const SizedBox(height: 4),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.home_outlined, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text('Deliver to: ${order.deliveryAddress}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  ),
                ]),
              ],

              if (order.orderDate != null) ...[
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(_formatDate(order.orderDate!),
                      style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                ]),
              ],

              if (order.replacementRequested) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      border: Border.all(color: Colors.orange.shade300),
                      borderRadius: BorderRadius.circular(8)),
                  child: Row(children: [
                    Icon(Icons.swap_horiz, size: 16, color: Colors.orange.shade700),
                    const SizedBox(width: 6),
                    Text('Refund / Replacement requested',
                        style: TextStyle(
                            color: Colors.orange.shade700,
                            fontSize: 13, fontWeight: FontWeight.w500)),
                  ]),
                ),
              ],

              const SizedBox(height: 12),

              // ── Action buttons ────────────────────────────────────────────

              // Cancel
              if (canCancel) _actionBtn(
                  icon: Icons.cancel_outlined, label: 'Cancel Order',
                  color: Colors.red, onTap: () => _confirmCancel(order)),

              // Refund / Replacement — gated on vendor policy + 7-day window
              if (isDelivered && !order.replacementRequested) ...[
                if (canCancel) const SizedBox(height: 8),
                if (!order.hasRefundableItems)
                  // Vendor does not allow returns for any item in this order
                  _noReturnsBadge()
                else if (canRefund)
                  _actionBtn(
                      icon: Icons.assignment_return,
                      label: 'Request Refund / Replacement',
                      color: Colors.blue,
                      onTap: () => _showRefundDialog(order))
                else if (!inWindow)
                  _disabledActionBtn(
                      icon: Icons.assignment_return,
                      label: 'Refund / Replacement (window expired)',
                      color: Colors.blue),
              ],

              // Report Issue — only within 7-day window
              if (order.trackingStatus != 'CANCELLED') ...[
                const SizedBox(height: 8),
                if (canReport)
                  _actionBtn(
                      icon: Icons.report_problem_outlined,
                      label: 'Report an Issue',
                      color: Colors.red.shade400,
                      onTap: () => _showReportIssueSheet(order))
                else if (isDelivered && !inWindow)
                  _disabledActionBtn(
                      icon: Icons.report_problem_outlined,
                      label: 'Report an Issue (window expired)',
                      color: Colors.red.shade300),
              ],

              // Rate this order — only after delivery, while items remain unreviewed
              if (canReview) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showReviewSheet(order),
                    icon: Icon(Icons.star_outline_rounded,
                        color: Colors.amber.shade700),
                    label: Text(
                      unreviewedItems.length == 1
                          ? 'Rate this product'
                          : 'Rate ${unreviewedItems.length} products',
                      style: TextStyle(color: Colors.amber.shade800),
                    ),
                    style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.amber.shade400),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                  ),
                ),
              ],

              // Reorder
              if (canReorder) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: isReordering ? null : () => _reorder(order),
                    icon: isReordering
                        ? const SizedBox(width: 16, height: 16,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.replay),
                    label: Text(isReordering ? 'Checking stock…' : 'Reorder'),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                  ),
                ),
              ],

              // Invoice Download — only for delivered orders
              if (isDelivered) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _downloadInvoice(order),
                    icon: Icon(Icons.picture_as_pdf_outlined,
                        color: Colors.teal.shade700),
                    label: Text('Download GST Invoice',
                        style: TextStyle(color: Colors.teal.shade700)),
                    style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.teal.shade300),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                  ),
                ),
              ],

              // View All Refunds link (shown after requesting one)
              if (order.replacementRequested) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: TextButton.icon(
                    onPressed: () => Navigator.push(context,
                        MaterialPageRoute(
                            builder: (_) => const RefundsScreen())),
                    icon: Icon(Icons.open_in_new,
                        size: 15, color: Colors.blue.shade600),
                    label: Text('View Refund Status',
                        style: TextStyle(color: Colors.blue.shade600)),
                  ),
                ),
              ],
            ]),
          ),
        ],
      ),
    );
  }

  Future<void> _downloadInvoice(Order order) async {
    _snack('Opening invoice…', Colors.teal);
    final ok = await InvoiceService.downloadInvoice(order.id);
    if (!mounted) return;
    if (!ok) _snack('Could not open invoice. Check your browser app.', Colors.red);
  }

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, color: color),
        label: Text(label, style: TextStyle(color: color)),
        style: OutlinedButton.styleFrom(
            side: BorderSide(color: color),
            padding: const EdgeInsets.symmetric(vertical: 10)),
      ),
    );
  }

  /// Greyed-out, non-tappable version shown when window has expired.
  Widget _disabledActionBtn({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: null,
        icon: Icon(icon, color: Colors.grey.shade400),
        label: Text(label, style: TextStyle(color: Colors.grey.shade400)),
        style: OutlinedButton.styleFrom(
            side: BorderSide(color: Colors.grey.shade300),
            padding: const EdgeInsets.symmetric(vertical: 10)),
      ),
    );
  }

  /// Shown when the vendor does not offer returns/refunds for this order's items.
  Widget _noReturnsBadge() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(children: [
        Icon(Icons.block, size: 15, color: Colors.red.shade600),
        const SizedBox(width: 8),
        Expanded(child: Text(
          'Refund & replacement not available — the vendor does not accept returns for this order.',
          style: TextStyle(fontSize: 12, color: Colors.red.shade700),
        )),
      ]),
    );
  }

  void _confirmCancel(Order order) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Order?'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context), child: const Text('No')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () { Navigator.pop(context); _cancel(order.id); },
            child: const Text('Yes, Cancel',
                style: TextStyle(color: Colors.white))),
        ],
      ),
    );
  }

  Widget _buildTrackingBar(Order order) {
    const steps    = ['Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const stepKeys = ['PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    int cur = stepKeys.indexOf(order.trackingStatus);
    if (cur < 0) cur = 0;
    return Row(children: List.generate(steps.length, (i) {
      final done = i <= cur;
      return Expanded(child: Column(children: [
        Row(children: [
          if (i > 0) Expanded(child: Container(height: 2,
              color: i <= cur ? Colors.blue.shade700 : Colors.grey[300])),
          Container(
            width: 26, height: 26,
            decoration: BoxDecoration(
                color: done ? Colors.blue.shade700 : Colors.grey[200],
                shape: BoxShape.circle),
            child: Icon(done ? Icons.check : Icons.circle,
                size: 13, color: done ? Colors.white : Colors.grey)),
          if (i < steps.length - 1) Expanded(child: Container(height: 2,
              color: i < cur ? Colors.blue.shade700 : Colors.grey[300])),
        ]),
        const SizedBox(height: 4),
        Text(steps[i],
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 9, color: done ? Colors.blue.shade700 : Colors.grey)),
      ]));
    }));
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: bold
            ? const TextStyle(fontWeight: FontWeight.bold)
            : TextStyle(color: Colors.grey[600])),
        Text(value, style: bold
            ? TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade700)
            : null),
      ]),
    );
  }

  String _formatDate(String raw) {
    try {
      final dt = DateTime.parse(raw);
      const m = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${dt.day} ${m[dt.month]} ${dt.year}';
    } catch (_) { return raw; }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Review Sheet
// ══════════════════════════════════════════════════════════════════════════════

class _ReviewSheet extends StatefulWidget {
  final Order           order;
  final List<OrderItem> items;       // unreviewed items only
  final VoidCallback    onSubmitted;
  const _ReviewSheet({
    required this.order,
    required this.items,
    required this.onSubmitted,
  });
  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  // Per-item state
  late final List<int>         _ratings;
  late final List<String>      _comments;
  late final List<List<XFile>> _photos;   // up to 5 photos per product

  int  _currentPage = 0;
  bool _submitting  = false;

  @override
  void initState() {
    super.initState();
    final n  = widget.items.length;
    _ratings = List.filled(n, 0);
    _comments = List.filled(n, '');
    _photos  = List.generate(n, (_) => []);
  }

  bool get _isLastPage => _currentPage == widget.items.length - 1;
  OrderItem get _current => widget.items[_currentPage];

  Future<void> _pickPhotos() async {
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 75);
    if (!mounted) return;
    final page     = _currentPage;
    final canAdd   = 5 - _photos[page].length;
    if (canAdd <= 0) return;
    setState(() => _photos[page].addAll(picked.take(canAdd)));
  }

  void _removePhoto(int idx) =>
      setState(() => _photos[_currentPage].removeAt(idx));

  Future<void> _submitCurrent() async {
    if (_ratings[_currentPage] == 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Please select a star rating'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating));
      return;
    }

    setState(() => _submitting = true);
    final item       = _current;
    final photoPaths = _photos[_currentPage].map((f) => f.path).toList();

    final res = await ReviewService.addReviewWithPhotos(
      productId:  item.productId!,
      orderId:    widget.order.id,
      rating:     _ratings[_currentPage],
      comment:    _comments[_currentPage].trim(),
      photoPaths: photoPaths,
    );

    setState(() => _submitting = false);
    if (!mounted) return;

    if (res['success'] == true) {
      if (_isLastPage) {
        final messenger = ScaffoldMessenger.of(context);
        Navigator.pop(context);
        widget.onSubmitted();
        final photosUploaded = res['photosUploaded'] as int? ?? 0;
        final msg = photosUploaded > 0
            ? 'Thank you! Review + $photosUploaded photo${photosUploaded == 1 ? '' : 's'} submitted.'
            : 'Thank you for your review!';
        messenger.showSnackBar(SnackBar(
            content: Text(msg),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating));
      } else {
        setState(() {
          _currentPage++;
        });
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['message'] ?? 'Failed to submit review'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating));
    }
  }

  void _skipCurrent() {
    if (_isLastPage) {
      Navigator.pop(context);
      widget.onSubmitted();
    } else {
      setState(() => _currentPage++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item  = _current;
    final total = widget.items.length;
    final pageN = _currentPage + 1;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      expand: false,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        child: Column(children: [
          // ── Handle bar ─────────────────────────────────────────────────
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2)),
          ),

          // ── Header ─────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(children: [
              Icon(Icons.star_rounded, color: Colors.amber.shade600, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(
                    total == 1 ? 'Rate your purchase' : 'Rate product $pageN of $total',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  if (total > 1)
                    // Progress dots
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(children: List.generate(total, (i) => Container(
                        width: i == _currentPage ? 16 : 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(
                          color: i <= _currentPage
                              ? Colors.amber.shade600 : Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ))),
                    ),
                ]),
              ),
              // Dismiss — closes the sheet without submitting anything
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Skip all',
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ),
            ]),
          ),
          const Divider(height: 1),

          // ── Scrollable body ────────────────────────────────────────────
          Expanded(child: ListView(
            controller: ctrl,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [

              // Product info
              Row(children: [
                if (item.imageLink.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(item.imageLink,
                        width: 60, height: 60, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            Container(width: 60, height: 60,
                                color: Colors.grey[200])))
                else
                  Container(width: 60, height: 60, color: Colors.grey[200],
                      child: const Icon(Icons.image, color: Colors.grey)),
                const SizedBox(width: 12),
                Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(item.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  if (item.quantity > 1)
                    Text('Qty: ${item.quantity}',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12)),
                ])),
              ]),
              const SizedBox(height: 20),

              // Star rating
              const Text('Your Rating *',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Row(children: List.generate(5, (i) {
                final filled = i < _ratings[_currentPage];
                return GestureDetector(
                  onTap: () => setState(() => _ratings[_currentPage] = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Icon(
                      filled ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: filled ? Colors.amber.shade600 : Colors.grey.shade400,
                      size: 38,
                    ),
                  ),
                );
              })),
              if (_ratings[_currentPage] > 0) ...[
                const SizedBox(height: 6),
                Text(
                  ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent']
                      [_ratings[_currentPage]],
                  style: TextStyle(
                      color: Colors.amber.shade700, fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 20),

              // Comment
              const Text('Review (optional)',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              // key: ValueKey(_currentPage) forces Flutter to recreate this
              // field whenever the page advances, so initialValue is re-applied
              // and the previous product's text doesn't bleed through.
              TextFormField(
                key: ValueKey(_currentPage),
                maxLines: 3,
                initialValue: _comments[_currentPage],
                decoration: InputDecoration(
                  hintText: 'Share your experience with this product…',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.all(12),
                ),
                onChanged: (v) => _comments[_currentPage] = v,
              ),
              const SizedBox(height: 20),

              // ── Photo Upload (up to 5 per product) ───────────────────────
              Row(children: [
                const Text('Add Photos (optional)',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const Spacer(),
                Text('${_photos[_currentPage].length}/5',
                    style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              ]),
              const SizedBox(height: 8),
              if (_photos[_currentPage].isNotEmpty) ...[
                SizedBox(
                  height: 72,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _photos[_currentPage].length,
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(
                            File(_photos[_currentPage][i].path),
                            width: 72, height: 72, fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: 2, right: 2,
                          child: GestureDetector(
                            onTap: () => _removePhoto(i),
                            child: Container(
                              decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle),
                              padding: const EdgeInsets.all(2),
                              child: const Icon(Icons.close,
                                  size: 12, color: Colors.white),
                            ),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              if (_photos[_currentPage].length < 5)
                OutlinedButton.icon(
                  onPressed: _submitting ? null : _pickPhotos,
                  icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                  label: Text(
                    _photos[_currentPage].isEmpty
                        ? 'Add Photos'
                        : 'Add More Photos',
                  ),
                  style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.blue.shade200),
                      foregroundColor: Colors.blue.shade700,
                      minimumSize: const Size(double.infinity, 42),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10))),
                ),
              const SizedBox(height: 24),

              // Submit / Skip buttons
              Row(children: [
                // Skip this product
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : _skipCurrent,
                    style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.grey.shade400),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10))),
                    child: Text(
                      _isLastPage ? 'Skip' : 'Skip this',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Submit this product's review
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _submitting ? null : _submitCurrent,
                    icon: _submitting
                        ? const SizedBox(width: 16, height: 16,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Icon(_isLastPage ? Icons.check : Icons.arrow_forward,
                            size: 18),
                    label: Text(
                      _submitting
                          ? 'Submitting…'
                          : _isLastPage
                              ? 'Submit Review'
                              : 'Submit & Next',
                    ),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10))),
                  ),
                ),
              ]),
            ],
          )),
        ]),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Live Tracking Bottom Sheet (unchanged)
// ══════════════════════════════════════════════════════════════════════════════

class _LiveTrackingSheet extends StatefulWidget {
  final Order order;
  const _LiveTrackingSheet({required this.order});
  @override
  State<_LiveTrackingSheet> createState() => _LiveTrackingSheetState();
}

class _LiveTrackingSheetState extends State<_LiveTrackingSheet> {
  Map<String, dynamic>? trackData;
  bool loading = true;
  String? error;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() { loading = true; error = null; });
    final res = await OrderService.trackOrder(widget.order.id);
    if (!mounted) return;
    if (res['success'] == true) {
      setState(() { trackData = res; loading = false; });
    } else {
      setState(() { error = res['message'] ?? 'Failed to load tracking'; loading = false; });
    }
  }

  Color _eventColor(String? status) {
    switch (status) {
      case 'PROCESSING':       return Colors.orange;
      case 'PACKED':           return Colors.amber.shade700;
      case 'SHIPPED':          return Colors.blue;
      case 'OUT_FOR_DELIVERY': return Colors.purple;
      case 'DELIVERED':        return Colors.green;
      case 'CANCELLED':        return Colors.red;
      default:                 return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.65, maxChildSize: 0.92, minChildSize: 0.4,
      expand: false,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        child: Column(children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                  color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(children: [
              Icon(Icons.my_location, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              Text('Live Tracking — Order #${widget.order.id}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(onPressed: _fetch, icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh'),
            ]),
          ),
          const Divider(height: 1),
          if (loading) const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (error != null)
            Expanded(child: Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
                const SizedBox(height: 12),
                Text(error!, textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600])),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _fetch, child: const Text('Retry')),
              ]))))
          else Expanded(child: ListView(
            controller: ctrl, padding: const EdgeInsets.all(20),
            children: [
              _buildProgressBar(),
              const SizedBox(height: 16),
              if (trackData!['estimatedDelivery'] != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.blue.shade100)),
                  child: Row(children: [
                    Icon(Icons.schedule, color: Colors.blue.shade700, size: 20),
                    const SizedBox(width: 10),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Estimated Delivery',
                          style: TextStyle(color: Colors.blue.shade600, fontSize: 12)),
                      Text(_fmtDateTime(trackData!['estimatedDelivery']),
                          style: TextStyle(
                              color: Colors.blue.shade800,
                              fontWeight: FontWeight.bold, fontSize: 15)),
                    ]),
                  ]),
                ),
                const SizedBox(height: 16),
              ],
              if (trackData!['currentCity'] != null &&
                  (trackData!['currentCity'] as String).isNotEmpty) ...[
                Row(children: [
                  Icon(Icons.location_on, color: Colors.red.shade400, size: 18),
                  const SizedBox(width: 6),
                  Text('Current location: ',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                  Text(trackData!['currentCity'],
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ]),
                const SizedBox(height: 16),
              ],
              const Text('Tracking History',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 12),
              ..._buildEventHistory(),
            ],
          )),
        ]),
      ),
    );
  }

  Widget _buildProgressBar() {
    final progress = ((trackData!['progressPercent'] ?? 0) as num).toDouble() / 100.0;
    final statusName = trackData!['currentStatus'] as String? ?? '';
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text('Progress', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        Text('${trackData!['progressPercent'] ?? 0}%',
            style: TextStyle(color: Colors.blue.shade700, fontWeight: FontWeight.bold)),
      ]),
      const SizedBox(height: 6),
      ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: LinearProgressIndicator(
          value: progress.clamp(0.0, 1.0),
          minHeight: 8,
          backgroundColor: Colors.grey[200],
          valueColor: AlwaysStoppedAnimation<Color>(
              statusName == 'DELIVERED' ? Colors.green : Colors.blue.shade600)),
      ),
      const SizedBox(height: 6),
      Text(_statusLabel(statusName),
          style: TextStyle(
              color: _statusColorFromName(statusName), fontWeight: FontWeight.w600)),
    ]);
  }

  List<Widget> _buildEventHistory() {
    final history = (trackData!['history'] as List? ?? [])
        .cast<Map<String, dynamic>>();
    if (history.isEmpty) {
      return [Center(child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text('No tracking events yet',
            style: TextStyle(color: Colors.grey[500]))))];
    }
    final reversed = history.reversed.toList();
    return List.generate(reversed.length, (i) {
      final e      = reversed[i];
      final color  = _eventColor(e['status'] as String?);
      final isLast = i == reversed.length - 1;
      return IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Column(children: [
            Container(width: 12, height: 12,
                margin: const EdgeInsets.only(top: 4),
                decoration: BoxDecoration(
                    color: color, shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [BoxShadow(
                        color: color.withValues(alpha: 0.4), blurRadius: 4)])),
            if (!isLast)
              Expanded(child: Container(width: 2, color: Colors.grey[200])),
          ]),
          const SizedBox(width: 14),
          Expanded(child: Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (e['status'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4)),
                  child: Text(_statusLabel(e['status']),
                      style: TextStyle(
                          color: color, fontSize: 11, fontWeight: FontWeight.bold))),
              if (e['description'] != null) ...[
                const SizedBox(height: 4),
                Text(e['description'],
                    style: const TextStyle(fontWeight: FontWeight.w500)),
              ],
              if (e['location'] != null) ...[
                const SizedBox(height: 2),
                Row(children: [
                  Icon(Icons.place, size: 13, color: Colors.grey[500]),
                  const SizedBox(width: 3),
                  Text(e['location'],
                      style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                ]),
              ],
              if (e['timestamp'] != null) ...[
                const SizedBox(height: 2),
                Text(_fmtDateTime(e['timestamp']),
                    style: TextStyle(color: Colors.grey[400], fontSize: 11)),
              ],
            ]),
          )),
        ]),
      );
    });
  }

  String _statusLabel(String? s) {
    switch (s) {
      case 'PROCESSING':       return 'Processing';
      case 'PACKED':           return 'Packed';
      case 'SHIPPED':          return 'Shipped';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED':        return 'Delivered';
      case 'CANCELLED':        return 'Cancelled';
      case 'REFUNDED':         return 'Refunded';
      default:                 return s ?? '';
    }
  }

  Color _statusColorFromName(String? s) {
    switch (s) {
      case 'PROCESSING':       return Colors.orange;
      case 'PACKED':           return Colors.amber.shade700;
      case 'SHIPPED':          return Colors.blue;
      case 'OUT_FOR_DELIVERY': return Colors.purple;
      case 'DELIVERED':        return Colors.green;
      default:                 return Colors.grey;
    }
  }

  String _fmtDateTime(String raw) {
    try {
      final dt = DateTime.parse(raw).toLocal();
      const mo = ['','Jan','Feb','Mar','Apr','May','Jun',
                   'Jul','Aug','Sep','Oct','Nov','Dec'];
      final h  = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final mi = dt.minute.toString().padLeft(2, '0');
      final ap = dt.hour >= 12 ? 'PM' : 'AM';
      return '${dt.day} ${mo[dt.month]} ${dt.year}, $h:$mi $ap';
    } catch (_) { return raw; }
  }
}