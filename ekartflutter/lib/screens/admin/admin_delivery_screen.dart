import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminDeliveryScreen extends StatefulWidget {
  const AdminDeliveryScreen({super.key});
  @override
  State<AdminDeliveryScreen> createState() => _AdminDeliveryScreenState();
}

class _AdminDeliveryScreenState extends State<AdminDeliveryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;
  bool _loading = true;

  List<Map<String, dynamic>> _pendingBoys   = [];
  List<Map<String, dynamic>> _activeBoys    = [];
  List<Map<String, dynamic>> _pendingOrders = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() { _tc.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await AdminService.getDeliveryData();
      if (!mounted) return;
      if (res['success'] == true) {
        setState(() {
          _pendingBoys   = List<Map<String, dynamic>>.from(res['pendingApproval']    ?? []);
          _activeBoys    = List<Map<String, dynamic>>.from(res['activeDeliveryBoys'] ?? []);
          _pendingOrders = List<Map<String, dynamic>>.from(res['unassignedOrders']   ?? []);
          _loading       = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _snack(String msg, Color color) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));

  Future<void> _approveDeliveryBoy(Map<String, dynamic> boy) async {
    final pinCodesCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Approve Delivery Partner'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Approve ${boy['name']}?'),
          const SizedBox(height: 12),
          TextField(
            controller: pinCodesCtrl,
            decoration: const InputDecoration(
              labelText: 'Assign PIN Codes (comma-separated)',
              hintText: 'e.g. 560001,560002',
              border: OutlineInputBorder(),
            ),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final res = await AdminService.approveDeliveryBoy(
        boy['id'] as int, assignedPinCodes: pinCodesCtrl.text.trim());
    _snack(res['message'] ?? (res['success'] == true ? 'Approved' : 'Failed'),
        res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _load();
  }

  Future<void> _rejectDeliveryBoy(Map<String, dynamic> boy) async {
    final reasonCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Reject Delivery Partner'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Reject ${boy['name']}?'),
          const SizedBox(height: 12),
          TextField(
            controller: reasonCtrl,
            decoration: const InputDecoration(
              labelText: 'Reason (optional)',
              border: OutlineInputBorder(),
            ),
          ),
        ]),
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
    final res = await AdminService.rejectDeliveryBoy(
        boy['id'] as int, reason: reasonCtrl.text.trim());
    _snack(res['message'] ?? (res['success'] == true ? 'Rejected' : 'Failed'),
        res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _load();
  }

  Future<void> _assignDeliveryBoy(Map<String, dynamic> order) async {
    final orderId = order['id'] as int;

    // Use active boys already loaded — no separate API call needed
    // (avoids the removed getEligibleDeliveryBoys method)
    final eligible = List<Map<String, dynamic>>.from(_activeBoys);

    if (eligible.isEmpty) {
      _snack('No active delivery boys available', Colors.orange);
      return;
    }

    int? selectedBoyId;
    await showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: Text('Assign Delivery — Order #$orderId'),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('Select a delivery partner:',
                  style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 8),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: eligible.length,
                  itemBuilder: (_, i) {
                    final b   = eligible[i];
                    final bid = b['id'] as int;
                    final selected = selectedBoyId == bid;
                    // Use InkWell + custom tile to avoid deprecated Radio props
                    return InkWell(
                      onTap: () => setS(() => selectedBoyId = bid),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: selected ? Colors.teal.withValues(alpha: 0.1) : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: selected ? Colors.teal : Colors.grey.shade300,
                            width: selected ? 2 : 1,
                          ),
                        ),
                        child: Row(children: [
                          Icon(
                            selected ? Icons.radio_button_checked : Icons.radio_button_off,
                            color: selected ? Colors.teal : Colors.grey,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(b['name'] as String? ?? 'Boy #$bid',
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text(b['deliveryBoyCode'] as String? ?? '',
                                style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ])),
                        ]),
                      ),
                    );
                  },
                ),
              ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
              onPressed: selectedBoyId == null ? null : () async {
                final nav = Navigator.of(ctx);
                final r = await AdminService.assignDeliveryBoy(orderId, selectedBoyId!);
                if (!mounted) return;
                nav.pop();
                _snack(r['message'] ?? (r['success'] == true ? 'Assigned!' : 'Failed'),
                    r['success'] == true ? Colors.green : Colors.red);
                if (r['success'] == true) _load();
              },
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Delivery Management'),
          if (_pendingBoys.isNotEmpty)
            Text('${_pendingBoys.length} pending approval',
                style: const TextStyle(fontSize: 11, color: Colors.white70)),
        ]),
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
        bottom: TabBar(
          controller: _tc,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: [
            Tab(text: 'Pending (${_pendingBoys.length})'),
            Tab(text: 'Active (${_activeBoys.length})'),
            const Tab(text: 'Assign Orders'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tc,
              children: [
                _buildPendingBoys(),
                _buildActiveBoys(),
                _buildAssignOrders(),
              ],
            ),
    );
  }

  Widget _buildPendingBoys() {
    if (_pendingBoys.isEmpty) {
      return const Center(child: Text('No pending approvals'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _pendingBoys.length,
      itemBuilder: (ctx, i) {
        final b = _pendingBoys[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          color: Colors.orange.shade50,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: BorderSide(color: Colors.orange.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.person_outline, color: Colors.orange),
                const SizedBox(width: 8),
                Expanded(child: Text(b['name'] as String? ?? '',
                    style: const TextStyle(fontWeight: FontWeight.bold))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                      color: Colors.orange.shade100, borderRadius: BorderRadius.circular(12)),
                  child: const Text('Pending',
                      style: TextStyle(color: Colors.deepOrange, fontSize: 11)),
                ),
              ]),
              const SizedBox(height: 4),
              Text('📧 ${b['email'] ?? ''}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              Text('📱 ${b['mobile'] ?? ''}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              if (b['warehouse'] != null)
                Text('📦 Preferred: ${(b['warehouse'] as Map)['name'] ?? ''}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red), foregroundColor: Colors.red),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Reject'),
                  onPressed: () => _rejectDeliveryBoy(b),
                )),
                const SizedBox(width: 10),
                Expanded(child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green, foregroundColor: Colors.white),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Approve'),
                  onPressed: () => _approveDeliveryBoy(b),
                )),
              ]),
            ]),
          ),
        );
      },
    );
  }

  Widget _buildActiveBoys() {
    if (_activeBoys.isEmpty) {
      return const Center(child: Text('No active delivery partners'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _activeBoys.length,
      itemBuilder: (ctx, i) {
        final b    = _activeBoys[i];
        final code = b['deliveryBoyCode'] as String? ?? '';
        final wh   = b['warehouse'] as Map<String, dynamic>?;
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.teal.shade100,
              child: Text(
                (b['name'] as String? ?? 'D')[0].toUpperCase(),
                style: TextStyle(color: Colors.teal.shade800, fontWeight: FontWeight.bold),
              ),
            ),
            title: Text(b['name'] as String? ?? '',
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (code.isNotEmpty) Text(code, style: const TextStyle(fontSize: 11)),
              if (wh != null)
                Text('${wh['name']} — ${wh['city']}', style: const TextStyle(fontSize: 11)),
              if ((b['assignedPinCodes'] as String? ?? '').isNotEmpty)
                Text('Pincodes: ${b['assignedPinCodes']}',
                    style: const TextStyle(fontSize: 10, color: Colors.grey)),
            ]),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: Colors.green.shade100, borderRadius: BorderRadius.circular(12)),
              child: const Text('Active', style: TextStyle(color: Colors.green, fontSize: 11)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAssignOrders() {
    if (_pendingOrders.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 12),
        Text('No orders awaiting delivery assignment',
            style: TextStyle(color: Colors.grey[500])),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _pendingOrders.length,
      itemBuilder: (ctx, i) {
        final o       = _pendingOrders[i];
        final orderId = o['id'] as int? ?? 0;
        final address = o['currentCity'] as String? ?? 'N/A';
        final total   = (o['totalPrice'] as num? ?? 0).toDouble();
        final items   = List.from(o['items'] ?? []);
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('Order #$orderId', style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Text('₹${total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ]),
              const SizedBox(height: 4),
              Row(children: [
                const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(child: Text(address,
                    style: const TextStyle(fontSize: 12, color: Colors.grey))),
              ]),
              Text('${items.length} item(s)', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal.shade700, foregroundColor: Colors.white),
                  icon: const Icon(Icons.delivery_dining, size: 18),
                  label: const Text('Assign Delivery Partner'),
                  onPressed: () => _assignDeliveryBoy(o),
                ),
              ),
            ]),
          ),
        );
      },
    );
  }
}