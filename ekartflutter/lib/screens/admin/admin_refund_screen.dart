import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminRefundScreen extends StatefulWidget {
  const AdminRefundScreen({super.key});
  @override
  State<AdminRefundScreen> createState() => _AdminRefundScreenState();
}

class _AdminRefundScreenState extends State<AdminRefundScreen> {
  List<Map<String, dynamic>> _refunds = [];
  bool _loading = true;
  String _filter = 'ALL'; // ALL | PENDING | APPROVED | REJECTED

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await AdminService.getRefunds();
    if (!mounted) return;
    setState(() { _refunds = list; _loading = false; });
  }

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'ALL') return _refunds;
    return _refunds.where((r) =>
        (r['status'] as String? ?? '').toUpperCase() == _filter).toList();
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color,
        behavior: SnackBarBehavior.floating));
  }

  Future<void> _processRefund(int orderId, String action) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(action == 'approve' ? 'Approve Refund' : 'Reject Refund'),
        content: Text(
          action == 'approve'
              ? 'Approve this refund request for Order #$orderId?'
              : 'Reject this refund request for Order #$orderId?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor:
                    action == 'approve' ? Colors.green : Colors.red,
                foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: Text(action == 'approve' ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final res = await AdminService.processRefund(orderId, action);
    _snack(
      res['message'] ?? (res['success'] == true ? 'Done' : 'Failed'),
      res['success'] == true ? Colors.green : Colors.red,
    );
    if (res['success'] == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Refund Management'),
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: Column(children: [
        // Filter bar
        Container(
          color: Colors.red.shade700,
          padding: const EdgeInsets.only(bottom: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: ['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) {
                final sel = _filter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(f),
                    selected: sel,
                    onSelected: (_) => setState(() => _filter = f),
                    selectedColor: Colors.white,
                    backgroundColor: Colors.white24,
                    labelStyle: TextStyle(
                        color: sel ? Colors.red.shade700 : Colors.white,
                        fontWeight: FontWeight.w600),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _filtered.isEmpty
                  ? Center(child: Column(
                      mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[300]),
                    const SizedBox(height: 12),
                    Text('No refund requests', style: TextStyle(color: Colors.grey[500])),
                  ]))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _filtered.length,
                        itemBuilder: (ctx, i) => _buildRefundCard(_filtered[i]),
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _buildRefundCard(Map<String, dynamic> r) {
    final orderId      = r['orderId']      as int?    ?? r['id'] as int? ?? 0;
    final reason       = r['reason']       as String? ?? 'No reason given';
    final status       = (r['status']      as String? ?? 'PENDING').toUpperCase();
    final customerName = r['customerName'] as String? ?? 'Customer';
    final amount       = (r['amount']      as num?    ?? 0).toDouble();
    final isPending    = status == 'PENDING';

    final statusColor = status == 'APPROVED'
        ? Colors.green
        : status == 'REJECTED'
            ? Colors.red
            : Colors.orange;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('Order #$orderId',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12)),
              child: Text(status,
                  style: TextStyle(color: statusColor,
                      fontWeight: FontWeight.w600, fontSize: 12)),
            ),
          ]),
          const SizedBox(height: 6),
          Row(children: [
            const Icon(Icons.person_outline, size: 14, color: Colors.grey),
            const SizedBox(width: 4),
            Text(customerName, style: const TextStyle(fontSize: 13)),
          ]),
          if (amount > 0) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.currency_rupee, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text('₹${amount.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ]),
          ],
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: Colors.grey.shade50, borderRadius: BorderRadius.circular(8)),
            child: Text('Reason: $reason',
                style: const TextStyle(fontSize: 13, color: Colors.black87)),
          ),
          if (isPending) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                      foregroundColor: Colors.red),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Reject'),
                  onPressed: () => _processRefund(orderId, 'reject'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Approve'),
                  onPressed: () => _processRefund(orderId, 'approve'),
                ),
              ),
            ]),
          ],
        ]),
      ),
    );
  }
}
