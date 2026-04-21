import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../../config/api_config.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

/// Real-time delivery boy load board — mirrors React's DeliveryAdmin
/// load board that auto-refreshes every 5 seconds.
class AdminDeliveryLoadBoardScreen extends StatefulWidget {
  const AdminDeliveryLoadBoardScreen({super.key});
  @override
  State<AdminDeliveryLoadBoardScreen> createState() =>
      _AdminDeliveryLoadBoardScreenState();
}

class _AdminDeliveryLoadBoardScreenState
    extends State<AdminDeliveryLoadBoardScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _boys = [];
  Timer? _timer;
  DateTime? _lastRefresh;

  // Transfer requests
  List<Map<String, dynamic>> _transferRequests = [];
  bool _loadingTransfers = true;

  @override
  void initState() {
    super.initState();
    _load();
    _loadTransfers();
    // Auto-refresh every 5 seconds like React
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<String?> _token() async => AuthService.currentUser?.token;

  Future<void> _load() async {
    try {
      final t = await _token();
      final res = await http.get(
          Uri.parse('${ApiConfig.base}/admin/delivery/boys/load'),
          headers: {'Authorization': 'Bearer $t'});
      final data = json.decode(res.body);
      if (data['success'] == true && mounted) {
        setState(() {
          _boys = List<Map<String, dynamic>>.from(data['deliveryBoys'] ?? []);
          _loading = false;
          _lastRefresh = DateTime.now();
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadTransfers() async {
    try {
      final res = await AdminService.getWarehouseChangeRequests();
      if (res['success'] == true && mounted) {
        final all = List<Map<String, dynamic>>.from(res['requests'] ?? []);
        setState(() {
          _transferRequests = all.where((t) => t['status'] == 'PENDING').toList();
          _loadingTransfers = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingTransfers = false);
    }
  }

  Future<void> _approveTransfer(int id) async {
    final res = await AdminService.approveWarehouseChangeRequest(id);
    _snack(res['message'] ?? (res['success'] == true ? 'Approved ✓' : 'Failed'),
        res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _loadTransfers();
  }

  Future<void> _rejectTransfer(int id) async {
    final reasonCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Reject Transfer'),
        content: TextField(
          controller: reasonCtrl,
          decoration: const InputDecoration(
              labelText: 'Reason (optional)', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final res = await AdminService.rejectWarehouseChangeRequest(id,
        adminNote: reasonCtrl.text.trim());
    _snack(res['message'] ?? (res['success'] == true ? 'Rejected' : 'Failed'),
        res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _loadTransfers();
  }

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Delivery Load Board'),
          if (_lastRefresh != null)
            Text('Updated ${_timeAgo(_lastRefresh!)}',
                style: const TextStyle(fontSize: 11, color: Colors.white70)),
        ]),
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                _load();
                _loadTransfers();
              }),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                // Summary row
                Row(children: [
                  _summaryCard('Total Boys', '${_boys.length}', Colors.indigo),
                  const SizedBox(width: 8),
                  _summaryCard('Online', '${_boys.where((b) => b['isOnline'] == true).length}', Colors.green),
                  const SizedBox(width: 8),
                  _summaryCard('At Capacity', '${_boys.where((b) => b['atCap'] == true).length}', Colors.red),
                ]),
                const SizedBox(height: 16),

                // Warehouse Transfer Requests
                if (!_loadingTransfers && _transferRequests.isNotEmpty) ...[
                  Row(children: [
                    Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                            color: Colors.blue.shade100,
                            borderRadius: BorderRadius.circular(12)),
                        child: Text('${_transferRequests.length} Transfer Requests',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                  ]),
                  const SizedBox(height: 8),
                  ..._transferRequests.map((t) => _transferCard(t)),
                  const SizedBox(height: 16),
                ],

                // Load board grid
                const Text('Delivery Partners',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                if (_boys.isEmpty)
                  const Center(
                      child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text('No delivery boys found',
                              style: TextStyle(color: Colors.grey))))
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.4,
                    ),
                    itemCount: _boys.length,
                    itemBuilder: (ctx, i) => _loadCard(_boys[i]),
                  ),
              ],
            ),
    );
  }

  Widget _loadCard(Map<String, dynamic> boy) {
    final isOnline = boy['isOnline'] == true;
    final atCap = boy['atCap'] == true;
    final activeOrders = boy['activeOrders'] as int? ?? 0;
    final maxOrders = boy['maxConcurrent'] as int? ?? 3;
    final slots = boy['slots'] as int? ?? (maxOrders - activeOrders).clamp(0, maxOrders);
    final pct = (activeOrders / maxOrders).clamp(0.0, 1.0);
    final barColor = atCap ? Colors.red : activeOrders > 0 ? Colors.amber : Colors.green;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: isOnline
              ? Colors.green.withValues(alpha: 0.04)
              : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: isOnline
                  ? Colors.green.withValues(alpha: 0.35)
                  : Colors.grey.shade200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                boy['name'] as String? ?? 'Boy',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                boy['code'] as String? ?? '',
                style: TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: Colors.grey.shade600),
              ),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
                color: isOnline ? Colors.green.shade100 : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(10)),
            child: Text(
              isOnline ? '🟢' : '⚫',
              style: const TextStyle(fontSize: 11),
            ),
          ),
        ]),
        const Spacer(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Active', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
            Text('$activeOrders / $maxOrders',
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.bold, color: barColor)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(barColor),
            minHeight: 5,
          ),
        ),
        const SizedBox(height: 4),
        if (atCap)
          Text('⚠ At capacity',
              style: TextStyle(fontSize: 9, color: Colors.red.shade700, fontWeight: FontWeight.bold))
        else if (!isOnline)
          Text('Offline — no auto-assigns',
              style: TextStyle(fontSize: 9, color: Colors.grey.shade500))
        else
          Text('$slots slot${slots != 1 ? 's' : ''} available',
              style: const TextStyle(fontSize: 9, color: Colors.green)),
      ]),
    );
  }

  Widget _transferCard(Map<String, dynamic> t) {
    final boy = t['deliveryBoy'] as Map<String, dynamic>?;
    final currentWh = boy?['warehouse'] as Map<String, dynamic>?;
    final requestedWh = t['requestedWarehouse'] as Map<String, dynamic>?;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Colors.blue.shade50,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: Colors.blue.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(boy?['name'] as String? ?? '—',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(width: 6),
            Text(boy?['deliveryBoyCode'] as String? ?? '',
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.warehouse_outlined, size: 14, color: Colors.grey),
            const SizedBox(width: 4),
            Text(
              '${currentWh?['name'] ?? 'None'} → ${requestedWh?['name'] ?? '—'}',
              style: const TextStyle(fontSize: 12),
            ),
          ]),
          if (t['reason'] != null && (t['reason'] as String).isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Reason: ${t['reason']}',
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.close, size: 14, color: Colors.red),
                label: const Text('Reject', style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red)),
                onPressed: () => _rejectTransfer(t['id'] as int),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check, size: 14, color: Colors.white),
                label: const Text('Approve',
                    style: TextStyle(color: Colors.white)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                onPressed: () => _approveTransfer(t['id'] as int),
              ),
            ),
          ]),
        ]),
      ),
    );
  }

  Widget _summaryCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.25))),
        child: Column(children: [
          Text(value,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: color)),
          Text(label,
              style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
              textAlign: TextAlign.center),
        ]),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final secs = DateTime.now().difference(dt).inSeconds;
    if (secs < 5) return 'just now';
    if (secs < 60) return '${secs}s ago';
    return '${(secs / 60).round()}m ago';
  }
}