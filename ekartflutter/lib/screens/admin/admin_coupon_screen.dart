import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminCouponScreen extends StatefulWidget {
  const AdminCouponScreen({super.key});
  @override
  State<AdminCouponScreen> createState() => _AdminCouponScreenState();
}

class _AdminCouponScreenState extends State<AdminCouponScreen> {
  List<Map<String, dynamic>> _coupons = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await AdminService.getCoupons();
    if (!mounted) return;
    setState(() { _coupons = list; _loading = false; });
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color,
        behavior: SnackBarBehavior.floating));
  }

  Future<void> _showCreateDialog() async {
    final codeCtrl    = TextEditingController();
    final descCtrl    = TextEditingController();
    final valueCtrl   = TextEditingController();
    final minCtrl     = TextEditingController(text: '0');
    final maxCtrl     = TextEditingController(text: '0');
    final limitCtrl   = TextEditingController(text: '0');
    String type       = 'FLAT';
    DateTime? expiry;
    bool saving       = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Create Coupon'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: codeCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                    labelText: 'Coupon Code *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                decoration: const InputDecoration(
                    labelText: 'Description *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: type,
                decoration: const InputDecoration(
                    labelText: 'Type', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'FLAT',    child: Text('Flat Discount (₹)')),
                  DropdownMenuItem(value: 'PERCENT', child: Text('Percentage (%)')),
                ],
                onChanged: (v) => setS(() => type = v!),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: valueCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                    labelText: type == 'FLAT' ? 'Discount Amount (₹) *' : 'Percentage (%) *',
                    border: const OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: TextField(
                  controller: minCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                      labelText: 'Min Order ₹', border: OutlineInputBorder()),
                )),
                const SizedBox(width: 8),
                Expanded(child: TextField(
                  controller: maxCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                      labelText: 'Max Discount ₹', border: OutlineInputBorder()),
                )),
              ]),
              const SizedBox(height: 10),
              TextField(
                controller: limitCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'Usage Limit (0=unlimited)',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: Text(expiry == null
                    ? 'No expiry date'
                    : 'Expires: ${expiry!.toLocal().toString().split(' ')[0]}')),
                TextButton.icon(
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: const Text('Pick Date'),
                  onPressed: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 30)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
                    );
                    if (d != null) setS(() => expiry = d);
                  },
                ),
              ]),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700,
                  foregroundColor: Colors.white),
              onPressed: saving ? null : () async {
                if (codeCtrl.text.trim().isEmpty || valueCtrl.text.trim().isEmpty) {
                  _snack('Code and value are required', Colors.orange);
                  return;
                }
                setS(() => saving = true);
                final body = <String, dynamic>{
                  'code':           codeCtrl.text.trim().toUpperCase(),
                  'description':    descCtrl.text.trim(),
                  'type':           type,
                  'value':          double.tryParse(valueCtrl.text) ?? 0,
                  'minOrderAmount': double.tryParse(minCtrl.text)   ?? 0,
                  'maxDiscount':    double.tryParse(maxCtrl.text)   ?? 0,
                  'usageLimit':     int.tryParse(limitCtrl.text)    ?? 0,
                  if (expiry != null) 'expiryDate': expiry!.toIso8601String().split('T')[0],
                };
                final nav = Navigator.of(ctx);
                final res = await AdminService.createCoupon(body);
                setS(() => saving = false);
                if (!mounted) return;
                nav.pop();
                _snack(res['message'] ?? (res['success'] == true
                    ? 'Coupon created' : 'Failed'),
                    res['success'] == true ? Colors.green : Colors.red);
                _load();
              },
              child: const Text('Create'),
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
        title: const Text('Coupon Management'),
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Create Coupon'),
        onPressed: _showCreateDialog,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _coupons.isEmpty
              ? const Center(child: Text('No coupons yet. Create one!'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _coupons.length,
                  itemBuilder: (ctx, i) {
                    final c       = _coupons[i];
                    final id      = c['id']       as int?    ?? 0;
                    final code    = c['code']     as String? ?? '';
                    final desc    = c['description'] as String? ?? '';
                    final type    = c['type']     as String? ?? '';
                    final value   = (c['value']   as num?    ?? 0).toDouble();
                    final active  = c['active']   as bool?   ?? false;
                    final used    = c['usedCount'] as int?   ?? 0;
                    final expiry  = c['expiryDate'] as String?;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: active
                                    ? Colors.green.shade100 : Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(code,
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: active
                                          ? Colors.green.shade800 : Colors.grey,
                                      fontFamily: 'monospace',
                                      letterSpacing: 1)),
                            ),
                            const Spacer(),
                            Switch(
                              value: active,
                              activeThumbColor: Colors.green,
                              onChanged: (_) async {
                                final res = await AdminService.toggleCoupon(id);
                                _snack(res['message'] ?? 'Done',
                                    res['success'] == true
                                        ? Colors.green : Colors.red);
                                _load();
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline,
                                  color: Colors.red),
                              onPressed: () async {
                                final ok = await showDialog<bool>(
                                  context: context,
                                  builder: (_) => AlertDialog(
                                    title: const Text('Delete Coupon'),
                                    content: Text(
                                        'Delete coupon "$code"? This cannot be undone.'),
                                    actions: [
                                      TextButton(
                                          onPressed: () =>
                                              Navigator.pop(context, false),
                                          child: const Text('Cancel')),
                                      TextButton(
                                        style: TextButton.styleFrom(
                                            foregroundColor: Colors.red),
                                        onPressed: () =>
                                            Navigator.pop(context, true),
                                        child: const Text('Delete'),
                                      ),
                                    ],
                                  ),
                                );
                                if (ok == true) {
                                  final res = await AdminService.deleteCoupon(id);
                                  _snack(res['message'] ?? 'Done',
                                      res['success'] == true
                                          ? Colors.green : Colors.red);
                                  _load();
                                }
                              },
                            ),
                          ]),
                          if (desc.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(desc, style: TextStyle(color: Colors.grey[600])),
                          ],
                          const SizedBox(height: 6),
                          Wrap(spacing: 8, runSpacing: 4, children: [
                            _chip(
                                type == 'FLAT'
                                    ? '₹${value.toStringAsFixed(0)} off'
                                    : '$value% off',
                                Colors.blue),
                            _chip('Used: $used times', Colors.purple),
                            if (expiry != null) _chip('Expires: $expiry', Colors.orange),
                            if (!active) _chip('INACTIVE', Colors.grey),
                          ]),
                        ]),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _chip(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12)),
    child: Text(label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
  );
}
