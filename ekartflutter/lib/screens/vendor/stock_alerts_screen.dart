import 'package:flutter/material.dart';
import '../../services/services.dart';

/// StockAlertsScreen can be used standalone (loads its own data)
/// or embedded in the vendor dashboard (pass alerts + onAcknowledge).
class StockAlertsScreen extends StatefulWidget {
  final List<Map<String, dynamic>>? alerts;
  final Future<void> Function(int id)? onAcknowledge;

  const StockAlertsScreen({
    super.key,
    this.alerts,
    this.onAcknowledge,
  });

  @override
  State<StockAlertsScreen> createState() => _StockAlertsScreenState();
}

class _StockAlertsScreenState extends State<StockAlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  bool _loading = true;

  bool get _standalone => widget.alerts == null;

  @override
  void initState() {
    super.initState();
    if (_standalone) {
      _load();
    } else {
      _alerts  = widget.alerts!;
      _loading = false;
    }
  }

  @override
  void didUpdateWidget(StockAlertsScreen old) {
    super.didUpdateWidget(old);
    if (!_standalone && widget.alerts != old.alerts) {
      setState(() => _alerts = widget.alerts!);
    }
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await VendorService.getStockAlerts();
    if (!mounted) return;
    setState(() {
      _alerts  = res['success'] == true
          ? List<Map<String, dynamic>>.from(res['alerts'] ?? []) : [];
      _loading = false;
    });
  }

  Future<void> _acknowledge(int id) async {
    if (widget.onAcknowledge != null) {
      await widget.onAcknowledge!(id);
    } else {
      final res = await VendorService.acknowledgeAlert(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['message'] ?? 'Done'),
        backgroundColor: res['success'] == true ? Colors.green : Colors.red,
      ));
      if (res['success'] == true) _load();
    }
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_alerts.isEmpty) {
      return Center(child: Column(
          mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.notifications_none, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 12),
        Text('No stock alerts', style: TextStyle(color: Colors.grey[500])),
      ]));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _alerts.length,
        itemBuilder: (ctx, i) {
          final a            = _alerts[i];
          final acknowledged = a['acknowledged'] as bool? ?? false;
          final productName  = a['productName']  as String? ?? 'Product';
          final stock        = a['stock']         as int?    ?? 0;
          final threshold    = a['threshold']     as int?    ?? 5;

          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            color: acknowledged ? null : Colors.orange.shade50,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: BorderSide(
                  color: acknowledged ? Colors.transparent : Colors.orange.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                Icon(
                  acknowledged ? Icons.check_circle : Icons.warning_amber,
                  color: acknowledged ? Colors.green : Colors.orange,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(productName,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text('Stock: $stock (threshold: $threshold)',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  if (acknowledged)
                    Text('Acknowledged',
                        style: TextStyle(color: Colors.green.shade700,
                            fontSize: 11, fontWeight: FontWeight.w600)),
                ])),
                if (!acknowledged)
                  TextButton(
                    onPressed: () => _acknowledge(a['id'] as int),
                    child: const Text('Acknowledge'),
                  ),
              ]),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_standalone) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Stock Alerts'),
          backgroundColor: Colors.indigo.shade700,
          foregroundColor: Colors.white,
          actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
        ),
        body: _buildBody(),
      );
    }
    return _buildBody();
  }
}
