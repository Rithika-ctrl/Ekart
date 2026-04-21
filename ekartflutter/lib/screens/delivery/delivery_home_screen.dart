// import 'package:flutter/material.dart';
// import '../../services/services.dart';
// import '../../services/auth_service.dart';
// import '../login_screen.dart';
// import 'delivery_order_card.dart';
// import 'delivery_warehouse_screen.dart';

// class DeliveryHomeScreen extends StatefulWidget {
//   const DeliveryHomeScreen({super.key});
//   @override
//   State<DeliveryHomeScreen> createState() => _DeliveryHomeScreenState();
// }

// class _DeliveryHomeScreenState extends State<DeliveryHomeScreen>
//     with SingleTickerProviderStateMixin {
//   late TabController _tabController;
//   bool _loading = true;

//   List<Map<String, dynamic>> _toPickUp  = [];
//   List<Map<String, dynamic>> _outNow    = [];
//   List<Map<String, dynamic>> _delivered = [];
//   Map<String, dynamic>? _profile;

//   @override
//   void initState() {
//     super.initState();
//     _tabController = TabController(length: 3, vsync: this);
//     _load();
//   }

//   @override
//   void dispose() {
//     _tabController.dispose();
//     super.dispose();
//   }

//   Future<void> _load() async {
//     setState(() => _loading = true);
//     try {
//       final res = await DeliveryBoyService.getHome();
//       if (!mounted) return;
//       if (res['success'] == true) {
//         setState(() {
//           _profile  = res['profile'] as Map<String, dynamic>?;
//           _toPickUp = List<Map<String, dynamic>>.from(res['toPickUp']  ?? []);
//           _outNow   = List<Map<String, dynamic>>.from(res['outNow']    ?? []);
//           _delivered= List<Map<String, dynamic>>.from(res['delivered'] ?? []);
//           _loading  = false;
//         });
//       } else {
//         setState(() => _loading = false);
//         _snack(res['message'] ?? 'Failed to load', Colors.red);
//       }
//     } catch (e) {
//       setState(() => _loading = false);
//       _snack('Error: $e', Colors.red);
//     }
//   }

//   void _snack(String msg, Color color) {
//     if (!mounted) return;
//     ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//         content: Text(msg),
//         backgroundColor: color,
//         behavior: SnackBarBehavior.floating));
//   }

//   Future<void> _markPickedUp(Map<String, dynamic> order) async {
//     final res = await DeliveryBoyService.markPickedUp(order['id']);
//     _snack(
//       res['message'] ?? (res['success'] == true ? 'Marked as Out for Delivery' : 'Failed'),
//       res['success'] == true ? Colors.green : Colors.red,
//     );
//     if (res['success'] == true) _load();
//   }

//   Future<void> _confirmDelivery(Map<String, dynamic> order) async {
//     final otpCtrl = TextEditingController();
//     final confirmed = await showDialog<bool>(
//       context: context,
//       builder: (_) => AlertDialog(
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//         title: const Row(children: [
//           Icon(Icons.verified_outlined, color: Colors.teal),
//           SizedBox(width: 8),
//           Text('Confirm Delivery'),
//         ]),
//         content: Column(mainAxisSize: MainAxisSize.min, children: [
//           Text('Order #${order['id']}',
//               style: const TextStyle(fontWeight: FontWeight.bold)),
//           const SizedBox(height: 4),
//           Text('Customer: ${(order['customer'] as Map?)?['name'] ?? ''}',
//               style: TextStyle(color: Colors.grey[600], fontSize: 13)),
//           const SizedBox(height: 14),
//           const Text('Enter the OTP shown in the customer\'s app:',
//               style: TextStyle(fontSize: 13)),
//           const SizedBox(height: 10),
//           TextField(
//             controller: otpCtrl,
//             keyboardType: TextInputType.number,
//             decoration: const InputDecoration(
//               labelText: 'Delivery OTP',
//               border: OutlineInputBorder(),
//               prefixIcon: Icon(Icons.lock_open_outlined),
//             ),
//             maxLength: 6,
//           ),
//         ]),
//         actions: [
//           TextButton(
//               onPressed: () => Navigator.pop(context, false),
//               child: const Text('Cancel')),
//           ElevatedButton.icon(
//             style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
//             icon: const Icon(Icons.check, color: Colors.white, size: 18),
//             label: const Text('Confirm', style: TextStyle(color: Colors.white)),
//             onPressed: () => Navigator.pop(context, true),
//           ),
//         ],
//       ),
//     );
//     if (confirmed != true) return;
//     final otp = int.tryParse(otpCtrl.text.trim()) ?? 0;
//     final res = await DeliveryBoyService.confirmDelivery(order['id'], otp);
//     _snack(
//       res['message'] ?? (res['success'] == true ? 'Delivered!' : 'Failed'),
//       res['success'] == true ? Colors.green : Colors.red,
//     );
//     if (res['success'] == true) _load();
//   }

//   @override
//   Widget build(BuildContext context) {
//     final user         = AuthService.currentUser;
//     final code         = user?.deliveryBoyCode ?? '';
//     final warehouse    = _profile?['warehouse'] as Map<String, dynamic>?;
//     final pins         = _profile?['assignedPinCodes'] as String? ?? '';
//     final hasPending   = _profile?['hasPendingWarehouseRequest'] == true;

//     return Scaffold(
//       backgroundColor: Colors.grey[50],
//       appBar: AppBar(
//         title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//           const Text('Delivery Dashboard',
//               style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
//           if (code.isNotEmpty)
//             Text(code, style: const TextStyle(fontSize: 11, color: Colors.white70)),
//         ]),
//         backgroundColor: Colors.teal.shade700,
//         foregroundColor: Colors.white,
//         actions: [
//           IconButton(
//             icon: const Icon(Icons.warehouse_outlined),
//             tooltip: 'Warehouse Transfer',
//             onPressed: () => Navigator.push(context,
//                 MaterialPageRoute(builder: (_) => const DeliveryWarehouseScreen())),
//           ),
//           IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
//           IconButton(
//             icon: const Icon(Icons.logout),
//             onPressed: () {
//               AuthService.logout();
//               Navigator.pushAndRemoveUntil(context,
//                   MaterialPageRoute(builder: (_) => const LoginScreen()),
//                   (_) => false);
//             },
//           ),
//         ],
//         bottom: TabBar(
//           controller: _tabController,
//           indicatorColor: Colors.white,
//           labelColor: Colors.white,
//           unselectedLabelColor: Colors.white60,
//           tabs: [
//             Tab(text: 'To Pick Up (${_toPickUp.length})'),
//             Tab(text: 'Out for Del. (${_outNow.length})'),
//             Tab(text: 'Delivered (${_delivered.length})'),
//           ],
//         ),
//       ),
//       body: _loading
//           ? const Center(child: CircularProgressIndicator())
//           : Column(children: [
//               _buildProfileCard(user?.name ?? '', warehouse, pins, hasPending),
//               _buildStatsRow(),
//               Expanded(
//                 child: TabBarView(
//                   controller: _tabController,
//                   children: [
//                     _buildOrderList(_toPickUp,
//                         emptyMsg: 'No orders to pick up',
//                         emptyIcon: Icons.inbox_outlined,
//                         actionLabel: '🛵  Mark Picked Up',
//                         actionColor: Colors.orange.shade700,
//                         onAction: _markPickedUp),
//                     _buildOrderList(_outNow,
//                         emptyMsg: 'No orders out for delivery',
//                         emptyIcon: Icons.local_shipping_outlined,
//                         actionLabel: '✅  Confirm Delivery (OTP)',
//                         actionColor: Colors.green.shade700,
//                         onAction: _confirmDelivery),
//                     _buildOrderList(_delivered,
//                         emptyMsg: 'No deliveries yet',
//                         emptyIcon: Icons.check_circle_outline),
//                   ],
//                 ),
//               ),
//             ]),
//     );
//   }

//   Widget _buildProfileCard(String name, Map<String, dynamic>? warehouse,
//       String pins, bool hasPending) {
//     return Container(
//       margin: const EdgeInsets.fromLTRB(12, 12, 12, 6),
//       padding: const EdgeInsets.all(14),
//       decoration: BoxDecoration(
//         gradient: LinearGradient(
//             colors: [Colors.teal.shade700, Colors.teal.shade500]),
//         borderRadius: BorderRadius.circular(14),
//         boxShadow: [
//           BoxShadow(
//               color: Colors.teal.withValues(alpha: 0.25),
//               blurRadius: 10,
//               offset: const Offset(0, 4))
//         ],
//       ),
//       child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//         Row(children: [
//           CircleAvatar(
//             backgroundColor: Colors.white24,
//             radius: 22,
//             child: Text(
//               name.isNotEmpty ? name[0].toUpperCase() : 'D',
//               style: const TextStyle(
//                   color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
//             ),
//           ),
//           const SizedBox(width: 12),
//           Expanded(
//             child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//               Text(name,
//                   style: const TextStyle(
//                       color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
//               if (warehouse != null)
//                 Text('📦 ${warehouse['name']} · ${warehouse['city']}',
//                     style: const TextStyle(color: Colors.white70, fontSize: 12)),
//               if (pins.isNotEmpty)
//                 Text('Pincodes: $pins',
//                     style: const TextStyle(color: Colors.white60, fontSize: 11)),
//             ]),
//           ),
//         ]),
//         if (hasPending) ...[
//           const SizedBox(height: 8),
//           Container(
//             padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
//             decoration: BoxDecoration(
//                 color: Colors.amber.withValues(alpha: 0.25),
//                 borderRadius: BorderRadius.circular(8),
//                 border: Border.all(color: Colors.amber.withValues(alpha: 0.5))),
//             child: const Row(children: [
//               Icon(Icons.hourglass_top_rounded, color: Colors.amber, size: 14),
//               SizedBox(width: 6),
//               Expanded(
//                 child: Text('Warehouse change request pending admin review',
//                     style: TextStyle(color: Colors.amber, fontSize: 11)),
//               ),
//             ]),
//           ),
//         ],
//       ]),
//     );
//   }

//   Widget _buildStatsRow() {
//     return Padding(
//       padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
//       child: Row(children: [
//         _statCard('${_toPickUp.length}', 'To Pick Up', Colors.orange),
//         const SizedBox(width: 8),
//         _statCard('${_outNow.length}', 'Out for Del.', Colors.blue),
//         const SizedBox(width: 8),
//         _statCard('${_delivered.length}', 'Delivered', Colors.green),
//       ]),
//     );
//   }

//   Widget _statCard(String value, String label, Color color) {
//     return Expanded(
//       child: Container(
//         padding: const EdgeInsets.symmetric(vertical: 10),
//         decoration: BoxDecoration(
//             color: color.withValues(alpha: 0.08),
//             borderRadius: BorderRadius.circular(10),
//             border: Border.all(color: color.withValues(alpha: 0.2))),
//         child: Column(children: [
//           Text(value,
//               style: TextStyle(
//                   fontWeight: FontWeight.bold, fontSize: 20, color: color)),
//           Text(label,
//               style: TextStyle(fontSize: 10, color: Colors.grey[600]),
//               textAlign: TextAlign.center),
//         ]),
//       ),
//     );
//   }

//   Widget _buildOrderList(
//     List<Map<String, dynamic>> orders, {
//     required String emptyMsg,
//     required IconData emptyIcon,
//     String? actionLabel,
//     Color? actionColor,
//     Future<void> Function(Map<String, dynamic>)? onAction,
//   }) {
//     if (orders.isEmpty) {
//       return Center(
//         child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
//           Icon(emptyIcon, size: 56, color: Colors.grey[300]),
//           const SizedBox(height: 12),
//           Text(emptyMsg,
//               style: TextStyle(color: Colors.grey[500], fontSize: 15)),
//         ]),
//       );
//     }
//     return RefreshIndicator(
//       onRefresh: () => _load(),
//       child: ListView.builder(
//         padding: const EdgeInsets.all(12),
//         itemCount: orders.length,
//         itemBuilder: (ctx, i) => DeliveryOrderCard(
//           order: orders[i],
//           actionLabel: actionLabel,
//           actionColor: actionColor,
//           onAction: onAction != null ? () => onAction(orders[i]) : null,
//         ),
//       ),
//     );
//   }
// }
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../login_screen.dart';
import 'delivery_order_card.dart';
import 'delivery_warehouse_screen.dart';

class DeliveryHomeScreen extends StatefulWidget {
  const DeliveryHomeScreen({super.key});
  @override
  State<DeliveryHomeScreen> createState() => _DeliveryHomeScreenState();
}

class _DeliveryHomeScreenState extends State<DeliveryHomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loading = true;

  List<Map<String, dynamic>> _toPickUp  = [];
  List<Map<String, dynamic>> _outNow    = [];
  List<Map<String, dynamic>> _delivered = [];
  Map<String, dynamic>? _profile;

  // ── Availability toggle ───────────────────────────────────────────────────
  bool _isAvailable      = false;
  bool _togglingAvailable = false;

  // ── Per-order OTP map ─────────────────────────────────────────────────────
  final Map<int, TextEditingController> _otpControllers = {};

  // ── Per-order photo maps ──────────────────────────────────────────────────
  final Map<int, String> _pickupPhotos  = {}; // orderId → base64
  final Map<int, String> _deliveryPhotos = {};

  // ── COD modal state ───────────────────────────────────────────────────────
  Map<String, dynamic>? _codModalOrder; // the order triggering COD modal
  String? _codPaymentStatus;            // 'COLLECTED' | 'FAILED'
  final _codAmountCtrl = TextEditingController();
  bool _confirmingCod  = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _codAmountCtrl.dispose();
    for (final c in _otpControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _otpCtrl(int orderId) {
    _otpControllers.putIfAbsent(orderId, () => TextEditingController());
    return _otpControllers[orderId]!;
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await DeliveryBoyService.getHome();
      if (!mounted) return;
      if (res['success'] == true) {
        final profileData = res['profile'] as Map<String, dynamic>?;
        setState(() {
          _profile   = profileData;
          _isAvailable = profileData?['isAvailable'] == true;
          _toPickUp  = List<Map<String, dynamic>>.from(res['toPickUp']  ?? []);
          _outNow    = List<Map<String, dynamic>>.from(res['outNow']    ?? []);
          _delivered = List<Map<String, dynamic>>.from(res['delivered'] ?? []);
          _loading   = false;
        });
      } else {
        setState(() => _loading = false);
        _snack(res['message'] ?? 'Failed to load', Colors.red);
      }
    } catch (e) {
      setState(() => _loading = false);
      _snack('Error: $e', Colors.red);
    }
  }

  // ── Availability toggle ───────────────────────────────────────────────────

  Future<void> _toggleAvailability() async {
    setState(() => _togglingAvailable = true);
    try {
      final newStatus = !_isAvailable;
      final res = await DeliveryBoyService.toggleAvailability(newStatus);
      if (!mounted) return;
      if (res['success'] == true) {
        final serverStatus = res['isAvailable'] is bool
            ? res['isAvailable'] as bool
            : newStatus;
        setState(() => _isAvailable = serverStatus);
        _snack(
          serverStatus
              ? '🟢 You are now ONLINE — Available for deliveries'
              : '⚫ You are now OFFLINE — Not available for deliveries',
          serverStatus ? Colors.green : Colors.grey.shade700,
        );
      } else {
        _snack(res['message'] ?? 'Failed to update status', Colors.red);
      }
    } catch (e) {
      _snack('Request failed: $e', Colors.red);
    } finally {
      if (mounted) setState(() => _togglingAvailable = false);
    }
  }

  // ── Pickup with photo ─────────────────────────────────────────────────────

  Future<void> _capturePhoto(int orderId, String type) async {
    final XFile? file = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 70,
      maxWidth: 1024,
    );
    if (file == null) return;
    final bytes  = await file.readAsBytes();
    final base64 = 'data:image/jpeg;base64,${_toBase64(bytes)}';
    setState(() {
      if (type == 'pickup') {
        _pickupPhotos[orderId] = base64;
      } else {
        _deliveryPhotos[orderId] = base64;
      }
    });
    _snack('📸 Photo captured successfully', Colors.green);
  }

  String _toBase64(List<int> bytes) {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    final out = StringBuffer();
    var i = 0;
    while (i < bytes.length) {
      final b0 = bytes[i++];
      final b1 = i < bytes.length ? bytes[i++] : 0;
      final b2 = i < bytes.length ? bytes[i++] : 0;
      out.write(chars[(b0 >> 2) & 0x3F]);
      out.write(chars[((b0 << 4) | (b1 >> 4)) & 0x3F]);
      out.write(chars[((b1 << 2) | (b2 >> 6)) & 0x3F]);
      out.write(chars[b2 & 0x3F]);
    }
    final s = out.toString();
    final pad = bytes.length % 3;
    if (pad == 1) return '${s.substring(0, s.length - 2)}==';
    if (pad == 2) return '${s.substring(0, s.length - 1)}=';
    return s;
  }

  Future<void> _handlePickupWithPhoto(Map<String, dynamic> order) async {
    final orderId = order['id'] as int;
    if (!_pickupPhotos.containsKey(orderId)) {
      _snack('📸 Please capture a photo of the parcel first', Colors.orange);
      await _capturePhoto(orderId, 'pickup');
      return;
    }
    final res = await DeliveryBoyService.markPickedUpWithPhoto(
        orderId, _pickupPhotos[orderId]!);
    _snack(
      res['message'] ?? (res['success'] == true ? '✓ Marked as picked up' : 'Failed'),
      res['success'] == true ? Colors.green : Colors.red,
    );
    if (res['success'] == true) {
      setState(() => _pickupPhotos.remove(orderId));
      _load();
    }
  }

  // ── Delivery with photo + OTP ─────────────────────────────────────────────

  Future<void> _handleDeliveryWithPhoto(Map<String, dynamic> order) async {
    final orderId = order['id'] as int;

    if (!_deliveryPhotos.containsKey(orderId)) {
      _snack('📸 Please capture a photo before confirming delivery', Colors.orange);
      await _capturePhoto(orderId, 'delivery');
      return;
    }

    final otp = _otpCtrl(orderId).text.trim();
    if (otp.isEmpty || otp.length != 6) {
      _snack('Enter the 6-digit OTP from customer.', Colors.orange);
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(children: [
          Icon(Icons.verified_outlined, color: Colors.teal),
          SizedBox(width: 8),
          Text('Confirm Delivery'),
        ]),
        content: Text(
          'Confirm delivery of Order #$orderId with OTP $otp?',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
            icon: const Icon(Icons.check, color: Colors.white, size: 18),
            label: const Text('Confirm', style: TextStyle(color: Colors.white)),
            onPressed: () => Navigator.pop(context, true),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final res = await DeliveryBoyService.confirmDeliveryWithPhoto(
        orderId, int.parse(otp), _deliveryPhotos[orderId]!);

    if (!mounted) return;

    _snack(
      res['message'] ?? (res['success'] == true ? '✓ Delivery confirmed' : 'Failed'),
      res['success'] == true ? Colors.green : Colors.red,
    );

    if (res['success'] == true) {
      setState(() => _deliveryPhotos.remove(orderId));
      // If COD order, show payment collection modal
      final isCod = order['isCod'] == true ||
          (order['paymentMode'] as String? ?? '').toUpperCase() == 'COD';
      if (isCod) {
        setState(() {
          _codModalOrder    = order;
          _codPaymentStatus = null;
          _codAmountCtrl.clear();
        });
        _showCodModal();
      } else {
        _load();
      }
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────

  Future<void> _resendOtp(int orderId) async {
    final res = await DeliveryBoyService.resendOtp(orderId);
    _snack(
      res['message'] ?? (res['success'] == true ? 'OTP resent to customer' : 'Failed to resend OTP'),
      res['success'] == true ? Colors.green : Colors.red,
    );
  }

  // ── COD modal ─────────────────────────────────────────────────────────────

  void _showCodModal() {
    if (_codModalOrder == null) return;
    final order     = _codModalOrder!;
    final orderId   = order['id'] as int;
    final totalAmt  = (order['totalPrice'] as num? ?? 0).toDouble();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setModal) => Container(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.monetization_on, color: Colors.amber.shade700, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('COD Payment Collection',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('Order #$orderId • ₹${totalAmt.toStringAsFixed(2)}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                  ]),
                ),
              ]),
              const SizedBox(height: 20),

              const Text('Payment Status *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: _codStatusBtn(
                    label: '✅ Collected',
                    value: 'COLLECTED',
                    color: Colors.green,
                    selectedStatus: _codPaymentStatus,
                    onTap: () => setState(() { _codPaymentStatus = 'COLLECTED'; setModal(() {}); }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _codStatusBtn(
                    label: '❌ Failed',
                    value: 'FAILED',
                    color: Colors.red,
                    selectedStatus: _codPaymentStatus,
                    onTap: () => setState(() { _codPaymentStatus = 'FAILED'; setModal(() {}); }),
                  ),
                ),
              ]),

              if (_codPaymentStatus == 'COLLECTED') ...[ 
                const SizedBox(height: 16),
                const Text('Amount Collected *',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                TextField(
                  controller: _codAmountCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    border: const OutlineInputBorder(),
                    prefixText: '₹ ',
                    hintText: totalAmt.toStringAsFixed(2),
                    helperText: 'Expected: ₹${totalAmt.toStringAsFixed(2)}',
                  ),
                ),
              ],

              if (_codPaymentStatus == 'FAILED') ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.amber.shade200)),
                  child: Row(children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.amber.shade700, size: 18),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Will be marked as failed collection. You can retry later.',
                          style: TextStyle(fontSize: 12)),
                    ),
                  ]),
                ),
              ],

              const SizedBox(height: 24),
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _confirmingCod ? null : () {
                      Navigator.pop(ctx);
                      setState(() { _codModalOrder = null; });
                      _load();
                    },
                    child: const Text('Skip'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade700,
                        foregroundColor: Colors.white),
                    onPressed: (_codPaymentStatus == null || _confirmingCod)
                        ? null
                        : () async {
                            if (_codPaymentStatus == 'COLLECTED' &&
                                _codAmountCtrl.text.trim().isEmpty) {
                              _snack('Enter amount collected', Colors.orange);
                              return;
                            }
                            setModal(() => _confirmingCod = true);
                            setState(() => _confirmingCod = true);
                            final amt = double.tryParse(_codAmountCtrl.text) ?? 0;
                            final res = await DeliveryBoyService.recordCodPayment(
                              orderId: orderId,
                              codStatus: _codPaymentStatus!,
                              amountCollected: amt,
                            );
                            setModal(() => _confirmingCod = false);
                            setState(() => _confirmingCod = false);
                            if (!mounted) return;
                            _snack(
                              res['message'] ?? (res['success'] == true
                                  ? '✅ Payment recorded'
                                  : 'Failed to record'),
                              res['success'] == true ? Colors.green : Colors.red,
                            );
                            Navigator.pop(ctx);
                            setState(() { _codModalOrder = null; });
                            _load();
                          },
                    child: _confirmingCod
                        ? const SizedBox(width: 18, height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Record',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
              const SizedBox(height: 8),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _codStatusBtn({
    required String label,
    required String value,
    required Color color,
    required String? selectedStatus,
    required VoidCallback onTap,
  }) {
    final selected = selectedStatus == value;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.12) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? color : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
        ),
        child: Text(label,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: selected ? color : Colors.grey.shade600)),
      ),
    );
  }

  // ── Contact helpers ───────────────────────────────────────────────────────

  Future<void> _callCustomer(String mobile) async {
    final uri = Uri.parse('tel:$mobile');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _whatsappCustomer(String mobile, int orderId) async {
    final clean = mobile.replaceAll(RegExp(r'\D'), '');
    final msg   = Uri.encodeComponent(
        "Hi, I'm the Ekart delivery partner for Order #$orderId.");
    final uri = Uri.parse('https://wa.me/$clean?text=$msg');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  // ── Snackbar ──────────────────────────────────────────────────────────────

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating));
  }

  // ── Pending approval guard ────────────────────────────────────────────────

  Widget _buildPendingApprovalPage() {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Ekart Delivery'),
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              AuthService.logout();
              Navigator.pushAndRemoveUntil(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false);
            },
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('⏳', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            const Text('Pending Admin Approval',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              'Your account is awaiting admin review.\n'
              'You\'ll receive an email at ${_profile?['email'] ?? ''} once approved.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade200)),
              child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('What happens next?',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                SizedBox(height: 8),
                Text('1. Admin reviews your application 🔍\n'
                    '2. Admin assigns your warehouse & pin codes 📦\n'
                    '3. You receive an approval email ✉️\n'
                    '4. You can start accepting deliveries 🛵',
                    style: TextStyle(fontSize: 13, height: 1.7)),
              ]),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Check Status'),
                onPressed: _load,
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    // Show loading spinner
    if (_loading) {
      return Scaffold(
        backgroundColor: Colors.grey.shade50,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    // Pending approval guard
    if (_profile != null && _profile!['approved'] == false) {
      return _buildPendingApprovalPage();
    }

    final user       = AuthService.currentUser;
    final code       = user?.deliveryBoyCode ?? '';
    final warehouse  = _profile?['warehouse'] as Map<String, dynamic>?;
    final pins       = _profile?['assignedPinCodes'] as String? ?? '';
    final hasPending = _profile?['hasPendingWarehouseRequest'] == true;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Delivery Dashboard',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          if (code.isNotEmpty)
            Text(code, style: const TextStyle(fontSize: 11, color: Colors.white70)),
        ]),
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
        actions: [
          // ── Availability toggle ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: _togglingAvailable
                ? const SizedBox(
                    width: 24, height: 24,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : GestureDetector(
                    onTap: _toggleAvailability,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _isAvailable
                            ? Colors.green.withValues(alpha: 0.25)
                            : Colors.white24,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: _isAvailable ? Colors.greenAccent : Colors.white38),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(
                          Icons.circle,
                          size: 8,
                          color: _isAvailable ? Colors.greenAccent : Colors.white54,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          _isAvailable ? 'Online' : 'Offline',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold),
                        ),
                      ]),
                    ),
                  ),
          ),
          IconButton(
            icon: const Icon(Icons.warehouse_outlined),
            tooltip: 'Warehouse Transfer',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const DeliveryWarehouseScreen())),
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              AuthService.logout();
              Navigator.pushAndRemoveUntil(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false);
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: [
            Tab(text: 'To Pick Up (${_toPickUp.length})'),
            Tab(text: 'Out for Del. (${_outNow.length})'),
            Tab(text: 'Delivered (${_delivered.length})'),
          ],
        ),
      ),
      body: Column(children: [
        _buildProfileCard(user?.name ?? '', warehouse, pins, hasPending),
        _buildStatsRow(),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildPickupList(),
              _buildOutForDeliveryList(),
              _buildDeliveredList(),
            ],
          ),
        ),
      ]),
    );
  }

  // ── Profile card ──────────────────────────────────────────────────────────

  Widget _buildProfileCard(String name, Map<String, dynamic>? warehouse,
      String pins, bool hasPending) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
            colors: [Colors.teal.shade700, Colors.teal.shade500]),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
              color: Colors.teal.withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
            backgroundColor: Colors.white24,
            radius: 22,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'D',
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name,
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              if (warehouse != null)
                Text('📦 ${warehouse['name']} · ${warehouse['city']}',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
              if (pins.isNotEmpty)
                Text('Pincodes: $pins',
                    style: const TextStyle(color: Colors.white60, fontSize: 11)),
            ]),
          ),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: _isAvailable
                  ? Colors.green.withValues(alpha: 0.25)
                  : Colors.white12,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: _isAvailable ? Colors.greenAccent : Colors.white24),
            ),
            child: Text(
              _isAvailable ? '🟢 Online' : '⚫ Offline',
              style: const TextStyle(
                  color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ]),
        if (hasPending) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.withValues(alpha: 0.5))),
            child: const Row(children: [
              Icon(Icons.hourglass_top_rounded, color: Colors.amber, size: 14),
              SizedBox(width: 6),
              Expanded(
                child: Text('Warehouse change request pending admin review',
                    style: TextStyle(color: Colors.amber, fontSize: 11)),
              ),
            ]),
          ),
        ],
      ]),
    );
  }

  // ── Stats row ─────────────────────────────────────────────────────────────

  Widget _buildStatsRow() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: Row(children: [
        _statCard('${_toPickUp.length}', 'To Pick Up', Colors.orange),
        const SizedBox(width: 8),
        _statCard('${_outNow.length}', 'Out for Del.', Colors.blue),
        const SizedBox(width: 8),
        _statCard('${_delivered.length}', 'Delivered', Colors.green),
      ]),
    );
  }

  Widget _statCard(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.2))),
        child: Column(children: [
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 20, color: color)),
          Text(label,
              style: TextStyle(fontSize: 10, color: Colors.grey[600]),
              textAlign: TextAlign.center),
        ]),
      ),
    );
  }

  // ── TO PICK UP list ───────────────────────────────────────────────────────

  Widget _buildPickupList() {
    if (_toPickUp.isEmpty) {
      return _emptyState('No orders to pick up', Icons.inbox_outlined);
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _toPickUp.length,
        itemBuilder: (ctx, i) {
          final order   = _toPickUp[i];
          final orderId = order['id'] as int;
          final isCod   = order['isCod'] == true ||
              (order['paymentMode'] as String? ?? '').toUpperCase() == 'COD';
          final mobile  = (order['customer'] as Map?)?['mobile']?.toString() ?? '';
          final hasPhoto = _pickupPhotos.containsKey(orderId);

          return DeliveryOrderCard(
            order: order,
            extraContent: Column(children: [
              // COD badge
              if (isCod) _codBadge(order),
              // Contact buttons
              _contactRow(mobile, orderId),
              const SizedBox(height: 8),
              // Photo + Pickup button
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: Icon(
                      hasPhoto ? Icons.check_circle : Icons.camera_alt_outlined,
                      size: 16,
                      color: hasPhoto ? Colors.green : Colors.teal,
                    ),
                    label: Text(
                      hasPhoto ? 'Photo ✓' : 'Take Photo',
                      style: TextStyle(
                          color: hasPhoto ? Colors.green : Colors.teal,
                          fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                        side: BorderSide(
                            color: hasPhoto ? Colors.green : Colors.teal)),
                    onPressed: () => _capturePhoto(orderId, 'pickup'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.directions_bike, size: 16,
                        color: Colors.white),
                    label: const Text('Picked Up',
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: hasPhoto
                            ? Colors.orange.shade700
                            : Colors.grey.shade400),
                    onPressed: () => _handlePickupWithPhoto(order),
                  ),
                ),
              ]),
              if (!hasPhoto)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(children: [
                    Icon(Icons.info_outline, size: 12,
                        color: Colors.orange.shade700),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text('Photo required before marking as picked up',
                          style: TextStyle(
                              fontSize: 11, color: Colors.orange.shade700)),
                    ),
                  ]),
                ),
            ]),
          );
        },
      ),
    );
  }

  // ── OUT FOR DELIVERY list ─────────────────────────────────────────────────

  Widget _buildOutForDeliveryList() {
    if (_outNow.isEmpty) {
      return _emptyState('No active deliveries', Icons.local_shipping_outlined);
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _outNow.length,
        itemBuilder: (ctx, i) {
          final order   = _outNow[i];
          final orderId = order['id'] as int;
          final isCod   = order['isCod'] == true ||
              (order['paymentMode'] as String? ?? '').toUpperCase() == 'COD';
          final mobile  = (order['customer'] as Map?)?['mobile']?.toString() ?? '';
          final hasPhoto = _deliveryPhotos.containsKey(orderId);

          return DeliveryOrderCard(
            order: order,
            extraContent: Column(children: [
              // COD badge
              if (isCod) _codBadge(order),
              // Contact buttons
              _contactRow(mobile, orderId),
              const SizedBox(height: 10),

              // Photo capture section
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.orange.shade200)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Icons.camera_alt_outlined,
                        size: 14, color: Colors.orange.shade700),
                    const SizedBox(width: 5),
                    Text('📸 Photo Before Delivery',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange.shade700)),
                  ]),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: Icon(
                        hasPhoto ? Icons.check_circle : Icons.camera_alt,
                        size: 15,
                        color: hasPhoto ? Colors.blue : Colors.orange.shade700,
                      ),
                      label: Text(
                        hasPhoto ? '✓ Photo Captured' : '📸 Capture Photo',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: hasPhoto
                                ? Colors.blue
                                : Colors.orange.shade700),
                      ),
                      style: OutlinedButton.styleFrom(
                          side: BorderSide(
                              color: hasPhoto
                                  ? Colors.blue
                                  : Colors.orange.shade300)),
                      onPressed: () => _capturePhoto(orderId, 'delivery'),
                    ),
                  ),
                  if (!hasPhoto)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('MANDATORY: Photo required before delivery',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.orange.shade800)),
                    ),
                ]),
              ),

              const SizedBox(height: 8),

              // OTP section
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.green.shade200)),
                child: Column(children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Row(children: [
                      Icon(Icons.key_outlined,
                          size: 14, color: Colors.green.shade700),
                      const SizedBox(width: 5),
                      Text('Delivery OTP',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade700)),
                    ]),
                    // Resend OTP button
                    TextButton.icon(
                      icon: const Icon(Icons.send_outlined, size: 12),
                      label: const Text('Resend OTP', style: TextStyle(fontSize: 11)),
                      style: TextButton.styleFrom(
                          foregroundColor: Colors.blue,
                          padding: EdgeInsets.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                      onPressed: () => _resendOtp(orderId),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: _otpCtrl(orderId),
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 6,
                        decoration: InputDecoration(
                          hintText: '000000',
                          counterText: '',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(
                                  color: Colors.green.shade300)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                        ),
                        style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 4),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.check, size: 16, color: Colors.white),
                      label: const Text('Deliver',
                          style: TextStyle(
                              color: Colors.white, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: hasPhoto
                              ? Colors.green.shade700
                              : Colors.grey.shade400,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 14)),
                      onPressed: hasPhoto
                          ? () => _handleDeliveryWithPhoto(order)
                          : null,
                    ),
                  ]),
                ]),
              ),
            ]),
          );
        },
      ),
    );
  }

  // ── DELIVERED list ────────────────────────────────────────────────────────

  Widget _buildDeliveredList() {
    if (_delivered.isEmpty) {
      return _emptyState('No deliveries yet', Icons.check_circle_outline);
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _delivered.length,
        itemBuilder: (ctx, i) => DeliveryOrderCard(order: _delivered[i]),
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Widget _codBadge(Map<String, dynamic> order) {
    final total = (order['totalPrice'] as num? ?? 0).toDouble();
    final deliveryCharge = (order['deliveryCharge'] as num? ?? 0).toDouble();
    final toCollect = total + deliveryCharge;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.red.shade200)),
      child: Row(children: [
        const Text('💵 COD',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: Colors.red)),
        const SizedBox(width: 8),
        Text('To Collect: ₹${toCollect.toStringAsFixed(2)}',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.red.shade700)),
      ]),
    );
  }

  Widget _contactRow(String mobile, int orderId) {
    return Row(children: [
      Expanded(
        child: OutlinedButton.icon(
          icon: const Icon(Icons.phone_outlined, size: 14),
          label: const Text('Call', style: TextStyle(fontSize: 12)),
          onPressed: mobile.isNotEmpty ? () => _callCustomer(mobile) : null,
        ),
      ),
      const SizedBox(width: 8),
      Expanded(
        child: OutlinedButton.icon(
          icon: const Icon(Icons.chat_outlined, size: 14, color: Colors.green),
          label: const Text('WhatsApp',
              style: TextStyle(fontSize: 12, color: Colors.green)),
          style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.green)),
          onPressed: mobile.isNotEmpty
              ? () => _whatsappCustomer(mobile, orderId)
              : null,
        ),
      ),
    ]);
  }

  Widget _emptyState(String msg, IconData icon) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 56, color: Colors.grey[300]),
        const SizedBox(height: 12),
        Text(msg, style: TextStyle(color: Colors.grey[500], fontSize: 15)),
      ]),
    );
  }
}