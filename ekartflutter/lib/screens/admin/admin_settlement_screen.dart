import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminSettlementScreen extends StatefulWidget {
  const AdminSettlementScreen({super.key});
  @override
  State<AdminSettlementScreen> createState() => _AdminSettlementScreenState();
}

class _AdminSettlementScreenState extends State<AdminSettlementScreen> {
  bool _loading = true;
  bool _processing = false;
  List<Map<String, dynamic>> _settlements = [];
  late TextEditingController _monthCtrl;

  static String _currentMonth() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _monthCtrl = TextEditingController(text: _currentMonth());
    _load();
  }

  @override
  void dispose() {
    _monthCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await AdminService.getSettlements(_monthCtrl.text.trim());
      if (res['success'] == true && mounted) {
        setState(() => _settlements = List<Map<String, dynamic>>.from(res['settlements'] ?? []));
      }
    } catch (e) {
      _snack('Failed: $e', Colors.red);
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _processSettlement() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Process Settlement'),
        content: Text(
            'Process settlement for ${_monthCtrl.text.trim()}?\n\n'
            'This finalizes COD collections and salary payments.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Process'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _processing = true);
    try {
      final res = await AdminService.processSettlement(_monthCtrl.text.trim());
      _snack(res['message'] ?? (res['success'] == true ? '✅ Settlement processed' : 'Failed'),
          res['success'] == true ? Colors.green : Colors.red);
      if (res['success'] == true) _load();
    } catch (e) {
      _snack('Error: $e', Colors.red);
    }
    if (mounted) setState(() => _processing = false);
  }

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));
  }

  String _fmt(num n) => '₹${n.toStringAsFixed(2)}';

  @override
  Widget build(BuildContext context) {
    final totalCollection =
        _settlements.fold<double>(0, (s, e) => s + ((e['totalCodCollected'] as num? ?? 0).toDouble()));
    final totalFailed =
        _settlements.fold<double>(0, (s, e) => s + ((e['failedCollectionAmount'] as num? ?? 0).toDouble()));
    final totalSalary = _settlements.length * 5000.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Monthly Settlement'),
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: Column(children: [
        // Month selector bar
        Container(
          color: Colors.indigo.shade700,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _monthCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Month (YYYY-MM)',
                  labelStyle: const TextStyle(color: Colors.white70),
                  filled: true,
                  fillColor: Colors.white12,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none),
                  isDense: true,
                ),
                onSubmitted: (_) => _load(),
              ),
            ),
            const SizedBox(width: 10),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green, foregroundColor: Colors.white),
              icon: _processing
                  ? const SizedBox(width: 14, height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline, size: 16),
              label: const Text('Process'),
              onPressed: (_processing || _settlements.isEmpty) ? null : _processSettlement,
            ),
          ]),
        ),

        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Summary cards
                    Row(children: [
                      _summaryCard('COD Collection', _fmt(totalCollection), Colors.green, Icons.attach_money),
                      const SizedBox(width: 10),
                      _summaryCard('Failed', _fmt(totalFailed), Colors.red, Icons.money_off),
                      const SizedBox(width: 10),
                      _summaryCard('Salary', _fmt(totalSalary), Colors.blue, Icons.payment),
                    ]),
                    const SizedBox(height: 14),

                    // Net settlement banner
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.shade200)),
                      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('Net Settlement',
                              style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600)),
                          Text(_fmt(totalCollection - totalSalary),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.green)),
                        ]),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text('${_settlements.length} delivery boys',
                              style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                          Text(_monthCtrl.text.trim(),
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                        ]),
                      ]),
                    ),
                    const SizedBox(height: 14),

                    if (_settlements.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(children: [
                            Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[300]),
                            const SizedBox(height: 12),
                            Text('No settlement data for ${_monthCtrl.text.trim()}',
                                style: TextStyle(color: Colors.grey[500])),
                          ]),
                        ),
                      )
                    else
                      ..._settlements.map((s) {
                        final collected = (s['totalCodCollected'] as num? ?? 0).toDouble();
                        final failed    = (s['failedCollectionAmount'] as num? ?? 0).toDouble();
                        const salary    = 5000.0;
                        final name      = s['deliveryBoyName'] as String? ?? 'DB-${s['deliveryBoyId']}';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                CircleAvatar(
                                  backgroundColor: Colors.indigo.shade100, radius: 18,
                                  child: Text(name[0].toUpperCase(),
                                      style: TextStyle(color: Colors.indigo.shade800, fontWeight: FontWeight.bold))),
                                const SizedBox(width: 10),
                                Expanded(child: Text(name,
                                    style: const TextStyle(fontWeight: FontWeight.bold))),
                                Text(_fmt(collected + salary),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              ]),
                              const SizedBox(height: 10),
                              const Divider(height: 1),
                              const SizedBox(height: 10),
                              Row(children: [
                                _detailChip('COD Orders', '${s['codOrderCount'] ?? 0}', Colors.blue),
                                const SizedBox(width: 8),
                                _detailChip('Collected', _fmt(collected), Colors.green),
                                const SizedBox(width: 8),
                                _detailChip('Failed', _fmt(failed), Colors.red),
                                const SizedBox(width: 8),
                                _detailChip('Salary', _fmt(salary), Colors.indigo),
                              ]),
                            ]),
                          ),
                        );
                      }),
                  ],
                ),
        ),
      ]),
    );
  }

  Widget _summaryCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.3))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
          Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[600])),
        ]),
      ),
    );
  }

  Widget _detailChip(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
        child: Column(children: [
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 12)),
          Text(label, style: TextStyle(fontSize: 9, color: Colors.grey[600]), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}