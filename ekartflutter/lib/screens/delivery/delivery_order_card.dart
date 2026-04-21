// import 'package:flutter/material.dart';

// class DeliveryOrderCard extends StatefulWidget {
//   final Map<String, dynamic> order;
//   final String? actionLabel;
//   final Color? actionColor;
//   final VoidCallback? onAction;

//   const DeliveryOrderCard({
//     super.key,
//     required this.order,
//     this.actionLabel,
//     this.actionColor,
//     this.onAction,
//   });

//   @override
//   State<DeliveryOrderCard> createState() => _DeliveryOrderCardState();
// }

// class _DeliveryOrderCardState extends State<DeliveryOrderCard> {
//   bool _busy = false;

//   Future<void> _handleAction() async {
//     if (_busy || widget.onAction == null) return;
//     setState(() => _busy = true);
//     try {
//       await Future.microtask(() => widget.onAction!());
//     } finally {
//       if (mounted) setState(() => _busy = false);
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     final order = widget.order;
//     final orderId        = order['id'] as int? ?? 0;
//     final status         = order['trackingStatus'] as String? ?? '';
//     final statusDisplay  = order['statusDisplay'] as String? ?? status;
//     final total          = (order['totalPrice'] as num? ?? 0).toDouble();
//     final paymentMode    = order['paymentMode'] as String? ?? '';
//     final deliveryTime   = order['deliveryTime'] as String? ?? '';
//     final address        = order['deliveryAddress'] as String? ?? '';
//     final currentCity    = order['currentCity'] as String? ?? '';
//     final customer       = order['customer'] as Map<String, dynamic>?;
//     final customerName   = customer?['name'] as String? ?? 'Customer';
//     final customerMobile = customer?['mobile']?.toString() ?? '';
//     final items          = List<Map<String, dynamic>>.from(order['items'] ?? []);
//     final statusColor    = _statusColor(status);

//     return Card(
//       margin: const EdgeInsets.only(bottom: 12),
//       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
//       elevation: 2,
//       child: Padding(
//         padding: const EdgeInsets.all(14),
//         child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//           // Header
//           Row(children: [
//             Container(
//               padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
//               decoration: BoxDecoration(
//                 color: statusColor.withValues(alpha: 0.12),
//                 borderRadius: BorderRadius.circular(20),
//               ),
//               child: Text('Order #$orderId',
//                   style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 13)),
//             ),
//             const Spacer(),
//             Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
//               Text('₹${total.toStringAsFixed(2)}',
//                   style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
//               Text(paymentMode,
//                   style: TextStyle(fontSize: 10, color: Colors.grey[500])),
//             ]),
//           ]),
//           const SizedBox(height: 10),

//           // Customer
//           Row(children: [
//             const Icon(Icons.person_outline, size: 15, color: Colors.grey),
//             const SizedBox(width: 5),
//             Expanded(child: Text(customerName,
//                 style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
//           ]),
//           if (customerMobile.isNotEmpty) ...[
//             const SizedBox(height: 3),
//             Row(children: [
//               const Icon(Icons.phone_outlined, size: 14, color: Colors.grey),
//               const SizedBox(width: 5),
//               Text(customerMobile,
//                   style: TextStyle(fontSize: 12, color: Colors.grey[700])),
//             ]),
//           ],

//           // Address
//           if (address.isNotEmpty) ...[
//             const SizedBox(height: 5),
//             Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
//               const Padding(padding: EdgeInsets.only(top: 1),
//                   child: Icon(Icons.location_on_outlined, size: 15, color: Colors.grey)),
//               const SizedBox(width: 5),
//               Expanded(child: Text(address,
//                   style: const TextStyle(fontSize: 12, color: Colors.black87))),
//             ]),
//           ],

//           // Current city
//           if (currentCity.isNotEmpty) ...[
//             const SizedBox(height: 3),
//             Row(children: [
//               const Icon(Icons.my_location, size: 13, color: Colors.teal),
//               const SizedBox(width: 5),
//               Expanded(child: Text(currentCity,
//                   style: const TextStyle(fontSize: 11, color: Colors.teal))),
//             ]),
//           ],

//           // Delivery type
//           if (deliveryTime.isNotEmpty) ...[
//             const SizedBox(height: 3),
//             Row(children: [
//               const Icon(Icons.schedule_outlined, size: 13, color: Colors.grey),
//               const SizedBox(width: 5),
//               Text(
//                 deliveryTime == 'EXPRESS' ? '⚡ Express Delivery' : '📦 Standard Delivery',
//                 style: TextStyle(fontSize: 11,
//                     color: deliveryTime == 'EXPRESS' ? Colors.orange.shade700 : Colors.grey[600]),
//               ),
//             ]),
//           ],

//           // Items
//           if (items.isNotEmpty) ...[
//             const SizedBox(height: 10),
//             const Divider(height: 1),
//             const SizedBox(height: 8),
//             Text('${items.length} item${items.length > 1 ? "s" : ""}',
//                 style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
//             const SizedBox(height: 4),
//             ...items.take(4).map((item) {
//               final name  = item['productName'] as String? ?? 'Item';
//               final qty   = item['quantity'] as int? ?? 1;
//               final price = (item['price'] as num? ?? 0).toDouble();
//               return Padding(
//                 padding: const EdgeInsets.only(bottom: 3),
//                 child: Row(children: [
//                   const Text('• ', style: TextStyle(color: Colors.grey, fontSize: 12)),
//                   Expanded(child: Text('$name × $qty', style: const TextStyle(fontSize: 12))),
//                   Text('₹${price.toStringAsFixed(0)}',
//                       style: TextStyle(fontSize: 11, color: Colors.grey[600])),
//                 ]),
//               );
//             }),
//             if (items.length > 4)
//               Text('  +${items.length - 4} more',
//                   style: TextStyle(fontSize: 11, color: Colors.grey[500])),
//           ],

//           // Status badge
//           const SizedBox(height: 10),
//           Container(
//             padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
//             decoration: BoxDecoration(
//                 color: statusColor.withValues(alpha: 0.1),
//                 borderRadius: BorderRadius.circular(12),
//                 border: Border.all(color: statusColor.withValues(alpha: 0.3))),
//             child: Text(statusDisplay,
//                 style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
//           ),

//           // Action button
//           if (widget.onAction != null && widget.actionLabel != null) ...[
//             const SizedBox(height: 12),
//             SizedBox(
//               width: double.infinity,
//               child: ElevatedButton(
//                 style: ElevatedButton.styleFrom(
//                     backgroundColor: widget.actionColor ?? Colors.teal,
//                     foregroundColor: Colors.white,
//                     padding: const EdgeInsets.symmetric(vertical: 12),
//                     shape: RoundedRectangleBorder(
//                         borderRadius: BorderRadius.circular(10))),
//                 onPressed: _busy ? null : _handleAction,
//                 child: _busy
//                     ? const SizedBox(width: 20, height: 20,
//                         child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
//                     : Text(widget.actionLabel!,
//                         style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//               ),
//             ),
//           ],
//         ]),
//       ),
//     );
//   }

//   Color _statusColor(String s) {
//     switch (s) {
//       case 'SHIPPED':          return Colors.orange;
//       case 'OUT_FOR_DELIVERY': return Colors.blue;
//       case 'DELIVERED':        return Colors.green;
//       case 'PROCESSING':
//       case 'PACKED':           return Colors.purple;
//       default:                 return Colors.grey;
//     }
//   }
// }

import 'package:flutter/material.dart';

class DeliveryOrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  /// Extra widgets injected below the order details (photo, OTP, COD, buttons)
  final Widget? extraContent;

  const DeliveryOrderCard({
    super.key,
    required this.order,
    this.extraContent,
  });

  @override
  Widget build(BuildContext context) {
    final orderId        = order['id'] as int? ?? 0;
    final status         = order['trackingStatus'] as String? ?? '';
    final statusDisplay  = order['statusDisplay'] as String? ?? status;
    final total          = (order['totalPrice'] as num? ?? 0).toDouble();
    final paymentMode    = order['paymentMode'] as String? ?? '';
    final deliveryTime   = order['deliveryTime'] as String? ?? '';
    final address        = order['deliveryAddress'] as String? ?? '';
    final pinCode        = order['deliveryPinCode']?.toString() ?? '';
    final landmark       = order['landmark'] as String? ?? '';
    final currentCity    = order['currentCity'] as String? ?? '';
    final customer       = order['customer'] as Map<String, dynamic>?;
    final customerName   = customer?['name'] as String? ?? 'Customer';
    final customerMobile = customer?['mobile']?.toString() ?? '';
    final items          = List<Map<String, dynamic>>.from(order['items'] ?? []);
    final statusColor    = _statusColor(status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // ── Header ──────────────────────────────────────────────────────
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('Order #$orderId',
                  style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 13)),
            ),
            const Spacer(),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('₹${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15)),
              if (paymentMode.isNotEmpty)
                Text(paymentMode,
                    style: TextStyle(fontSize: 10, color: Colors.grey[500])),
            ]),
          ]),
          const SizedBox(height: 10),

          // ── Customer ─────────────────────────────────────────────────────
          Row(children: [
            const Icon(Icons.person_outline, size: 15, color: Colors.grey),
            const SizedBox(width: 5),
            Expanded(child: Text(customerName,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w500))),
          ]),
          if (customerMobile.isNotEmpty) ...[
            const SizedBox(height: 3),
            Row(children: [
              const Icon(Icons.phone_outlined, size: 14, color: Colors.grey),
              const SizedBox(width: 5),
              Text(customerMobile,
                  style: TextStyle(fontSize: 12, color: Colors.grey[700])),
            ]),
          ],

          // ── Address ──────────────────────────────────────────────────────
          if (address.isNotEmpty) ...[
            const SizedBox(height: 5),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Padding(
                  padding: EdgeInsets.only(top: 1),
                  child: Icon(Icons.location_on_outlined,
                      size: 15, color: Colors.grey)),
              const SizedBox(width: 5),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(address,
                      style: const TextStyle(
                          fontSize: 12, color: Colors.black87)),
                  if (landmark.isNotEmpty)
                    Text('📍 $landmark',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[600],
                            fontStyle: FontStyle.italic)),
                ],
              )),
            ]),
          ],

          // ── PIN code ─────────────────────────────────────────────────────
          if (pinCode.isNotEmpty) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(6)),
              child: Text('📍 PIN: $pinCode',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.indigo.shade700)),
            ),
          ],

          // ── Current city ─────────────────────────────────────────────────
          if (currentCity.isNotEmpty) ...[
            const SizedBox(height: 3),
            Row(children: [
              const Icon(Icons.my_location, size: 13, color: Colors.teal),
              const SizedBox(width: 5),
              Expanded(child: Text(currentCity,
                  style: const TextStyle(fontSize: 11, color: Colors.teal))),
            ]),
          ],

          // ── Delivery type ─────────────────────────────────────────────────
          if (deliveryTime.isNotEmpty) ...[
            const SizedBox(height: 3),
            Row(children: [
              const Icon(Icons.schedule_outlined, size: 13, color: Colors.grey),
              const SizedBox(width: 5),
              Text(
                deliveryTime == 'EXPRESS'
                    ? '⚡ Express Delivery'
                    : '📦 Standard Delivery',
                style: TextStyle(
                    fontSize: 11,
                    color: deliveryTime == 'EXPRESS'
                        ? Colors.orange.shade700
                        : Colors.grey[600]),
              ),
            ]),
          ],

          // ── Items ────────────────────────────────────────────────────────
          if (items.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 8),
            Text('${items.length} item${items.length > 1 ? "s" : ""}',
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            ...items.take(4).map((item) {
              final name  = item['productName'] as String? ?? 'Item';
              final qty   = item['quantity'] as int? ?? 1;
              final price = (item['price'] as num? ?? 0).toDouble();
              return Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Row(children: [
                  const Text('• ',
                      style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Expanded(child: Text('$name × $qty',
                      style: const TextStyle(fontSize: 12))),
                  Text('₹${price.toStringAsFixed(0)}',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                ]),
              );
            }),
            if (items.length > 4)
              Text('  +${items.length - 4} more',
                  style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          ],

          // ── Status badge ─────────────────────────────────────────────────
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: statusColor.withValues(alpha: 0.3))),
            child: Text(statusDisplay,
                style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600)),
          ),

          // ── Injected content (photo/OTP/COD/contact/buttons) ─────────────
          if (extraContent != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            extraContent!,
          ],
        ]),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'SHIPPED':          return Colors.orange;
      case 'OUT_FOR_DELIVERY': return Colors.blue;
      case 'DELIVERED':        return Colors.green;
      case 'PROCESSING':
      case 'PACKED':           return Colors.purple;
      default:                 return Colors.grey;
    }
  }
}