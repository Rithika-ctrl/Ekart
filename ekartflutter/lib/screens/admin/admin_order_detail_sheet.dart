import 'package:flutter/material.dart';

/// Full-featured Admin Order Management with:
/// - Order detail modal with line items & price breakdown
/// - COD delivery confirmation from admin side
/// - Warehouse transfer request handling
/// - Delivery boy load board
class AdminOrderDetailSheet extends StatelessWidget {
  final Map<String, dynamic> order;
  final Future<void> Function(int id, String status) onUpdateStatus;
  final Future<void> Function(int id)? onCancelOrder;

  const AdminOrderDetailSheet({
    super.key,
    required this.order,
    required this.onUpdateStatus,
    this.onCancelOrder,
  });

  static const Map<String, Color> _statusColors = {
    'PLACED': Color(0xFFD97706),
    'CONFIRMED': Color(0xFF2563EB),
    'SHIPPED': Color(0xFF0284C7),
    'OUT_FOR_DELIVERY': Color(0xFF7C3AED),
    'DELIVERED': Color(0xFF16A34A),
    'CANCELLED': Color(0xFFDC2626),
  };

  String _fmt(num? n) =>
      '₹${(n ?? 0).toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d{2,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';

  @override
  Widget build(BuildContext context) {
    final items = List<Map<String, dynamic>>.from(order['items'] ?? []);
    final status = order['trackingStatus'] as String? ?? '';
    final statusColor = _statusColors[status] ?? Colors.grey;
    final subtotal = items.fold<double>(
        0, (s, i) => s + ((i['price'] as num? ?? 0) * (i['quantity'] as num? ?? 1)));
    final deliveryCharge = (order['deliveryCharge'] as num? ?? 0).toDouble();
    final totalPrice = (order['totalPrice'] as num? ?? order['amount'] as num? ?? 0).toDouble();
    final discount = (subtotal + deliveryCharge - totalPrice).clamp(0, double.infinity);
    final isCancellable = status != 'CANCELLED' && status != 'DELIVERED';

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 10),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2)),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.inventory_2_outlined, color: Colors.blue),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Order #${order['id']}',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(
                      '${order['customerName'] ?? 'Unknown'}${order['orderDate'] != null ? ' · ${_formatDate(order['orderDate'].toString())}' : ''}',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ]),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20)),
                  child: Text(
                    status.replaceAll('_', ' '),
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                  ),
                ),
                IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx)),
              ]),
            ),
            const Divider(height: 1),

            // Scrollable body
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.all(20),
                children: [
                  // Meta pills
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    _metaPill('Payment', order['paymentMode'] ?? '—'),
                    _metaPill('Delivery', order['deliveryTime'] ?? '—'),
                    _metaPill('City', order['currentCity'] ?? '—'),
                    if (order['replacementRequested'] == true)
                      _metaPill('Replacement', 'Requested', color: Colors.orange),
                  ]),
                  const SizedBox(height: 20),

                  // Line items
                  Text('Line Items (${items.length})',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 10),
                  if (items.isEmpty)
                    const Center(
                        child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 20),
                            child: Text('No items', style: TextStyle(color: Colors.grey))))
                  else
                    ...items.map((item) => _orderItemTile(item)),

                  const SizedBox(height: 16),
                  const Divider(),

                  // Price breakdown
                  const Text('Price Breakdown',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 10),
                  _priceRow('Subtotal', _fmt(subtotal)),
                  _priceRow('Delivery Charge', _fmt(deliveryCharge)),
                  if (discount > 0)
                    _priceRow('Discount / Coupon', '- ${_fmt(discount)}',
                        valueColor: Colors.green),
                  const Divider(height: 20),
                  _priceRow('Total', _fmt(totalPrice),
                      bold: true, valueColor: Colors.green),

                  const SizedBox(height: 20),

                  // Update status
                  const Text('Update Status',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  InputDecorator(
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    child: DropdownButton<String>(
                      value: status,
                      isExpanded: true,
                      underline: const SizedBox.shrink(),
                      items: [
                        'PLACED', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY',
                        'DELIVERED', 'CANCELLED'
                      ]
                          .map((s) => DropdownMenuItem(
                              value: s, child: Text(s.replaceAll('_', ' '))))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) {
                          Navigator.pop(ctx);
                          onUpdateStatus(order['id'] as int, v);
                        }
                      },
                    ),
                  ),

                  if (isCancellable && onCancelOrder != null) ...[
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                      label: const Text('Cancel Order',
                          style: TextStyle(color: Colors.red)),
                      style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.red),
                          minimumSize: const Size(double.infinity, 46)),
                      onPressed: () {
                        Navigator.pop(ctx);
                        onCancelOrder!(order['id'] as int);
                      },
                    ),
                  ],

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }

  Widget _metaPill(String label, String value, {Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
          color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: color ?? Colors.black87)),
      ]),
    );
  }

  Widget _orderItemTile(Map<String, dynamic> item) {
    final price = (item['price'] as num? ?? 0).toDouble();
    final qty = item['quantity'] as int? ?? 1;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(10)),
      child: Row(children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8)),
          child: item['imageLink'] != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(item['imageLink'].toString(),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          const Icon(Icons.shopping_bag_outlined)))
              : const Icon(Icons.shopping_bag_outlined),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item['name'] as String? ?? 'Item',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            Text(item['category'] as String? ?? '',
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ]),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(_fmt(price * qty),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          Text('₹${price.toStringAsFixed(0)} × $qty',
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ]),
      ]),
    );
  }

  Widget _priceRow(String label, String value,
      {bool bold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 13,
                  color: bold ? Colors.black87 : Colors.grey.shade600,
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(value,
              style: TextStyle(
                  fontSize: bold ? 15 : 13,
                  fontWeight: bold ? FontWeight.bold : FontWeight.w600,
                  color: valueColor ?? Colors.black87)),
        ],
      ),
    );
  }
}

/// Admin COD Delivery Confirmation Dialog
class AdminCodConfirmationDialog extends StatefulWidget {
  final int orderId;
  final bool isCod;
  final double totalAmount;
  final Future<void> Function(int orderId, String codStatus, double amountCollected) onConfirm;

  const AdminCodConfirmationDialog({
    super.key,
    required this.orderId,
    required this.isCod,
    required this.totalAmount,
    required this.onConfirm,
  });

  @override
  State<AdminCodConfirmationDialog> createState() => _AdminCodConfirmationDialogState();
}

class _AdminCodConfirmationDialogState extends State<AdminCodConfirmationDialog> {
  String _codStatus = 'COLLECTED';
  final _amountCtrl = TextEditingController();
  bool _confirming = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (widget.isCod && _amountCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Enter the amount collected')));
      return;
    }
    setState(() => _confirming = true);
    await widget.onConfirm(
      widget.orderId,
      _codStatus,
      double.tryParse(_amountCtrl.text) ?? widget.totalAmount,
    );
    if (mounted) Navigator.pop(context);
    setState(() => _confirming = false);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text('Confirm Delivery — Order #${widget.orderId}'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        if (widget.isCod) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.shade200)),
            child: Row(children: [
              const Icon(Icons.monetization_on, color: Colors.amber),
              const SizedBox(width: 8),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Cash on Delivery Order',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(
                    'Total: ₹${widget.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 14),

          const Align(
              alignment: Alignment.centerLeft,
              child: Text('Payment Status *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13))),
          const SizedBox(height: 6),
          Row(children: [
            Expanded(
              child: _statusBtn(
                  '✅ Collected', 'COLLECTED', Colors.green, _codStatus,
                  () => setState(() => _codStatus = 'COLLECTED')),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _statusBtn(
                  '❌ Failed', 'FAILED', Colors.red, _codStatus,
                  () => setState(() => _codStatus = 'FAILED')),
            ),
          ]),
          if (_codStatus == 'COLLECTED') ...[
            const SizedBox(height: 12),
            TextField(
              controller: _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Amount Collected (₹)',
                border: const OutlineInputBorder(),
                prefixText: '₹ ',
                hintText: widget.totalAmount.toStringAsFixed(2),
              ),
            ),
          ],
        ] else
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200)),
            child: const Row(children: [
              Icon(Icons.check_circle_outline, color: Colors.green),
              SizedBox(width: 8),
              Expanded(
                child: Text('Prepaid Order — Payment already received online',
                    style: TextStyle(color: Colors.green, fontWeight: FontWeight.w500)),
              ),
            ]),
          ),
      ]),
      actions: [
        TextButton(
            onPressed: _confirming ? null : () => Navigator.pop(context),
            child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green, foregroundColor: Colors.white),
          onPressed: _confirming ? null : _confirm,
          child: _confirming
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('✓ Confirm Delivery'),
        ),
      ],
    );
  }

  Widget _statusBtn(String label, String value, Color color, String selected,
      VoidCallback onTap) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.12) : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
                color: isSelected ? color : Colors.grey.shade300,
                width: isSelected ? 2 : 1)),
        child: Text(label,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: isSelected ? color : Colors.grey.shade600,
                fontSize: 12)),
      ),
    );
  }
}