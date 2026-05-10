import 'package:flutter/material.dart';
import '../../services/services.dart';

class DeliveryWarehouseScreen extends StatefulWidget {
  const DeliveryWarehouseScreen({super.key});
  @override
  State<DeliveryWarehouseScreen> createState() => _DeliveryWarehouseScreenState();
}

class _DeliveryWarehouseScreenState extends State<DeliveryWarehouseScreen> {
  final _reasonCtrl = TextEditingController();
  List<Map<String, dynamic>> _warehouses = [];
  int? _selectedWarehouseId;
  bool _loading = false;
  bool _loadingWh = true;

  @override
  void initState() {
    super.initState();
    _loadWarehouses();
  }

  @override
  void dispose() { _reasonCtrl.dispose(); super.dispose(); }

  Future<void> _loadWarehouses() async {
    final list = await DeliveryBoyService.getWarehouses();
    setState(() { _warehouses = list; _loadingWh = false; });
  }

  Future<void> _submitRequest() async {
    if (_selectedWarehouseId == null) {
      _snack('Please select a warehouse', Colors.orange);
      return;
    }
    setState(() => _loading = true);
    final res = await DeliveryBoyService.requestWarehouseChange(
        _selectedWarehouseId!, _reasonCtrl.text.trim());
    setState(() => _loading = false);
    if (!mounted) return;
    _snack(
      res['message'] ?? (res['success'] == true
          ? 'Request submitted successfully'
          : 'Request failed'),
      res['success'] == true ? Colors.green : Colors.red,
    );
    if (res['success'] == true) {
      _reasonCtrl.clear();
      setState(() => _selectedWarehouseId = null);
    }
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: color,
            behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Warehouse Transfer Request'),
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Info card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.teal.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.teal.shade200),
            ),
            child: Row(children: [
              Icon(Icons.info_outline, color: Colors.teal.shade700),
              const SizedBox(width: 10),
              Expanded(child: Text(
                'Submit a request to transfer to a different warehouse. '
                'An admin will review and approve/reject your request.',
                style: TextStyle(color: Colors.teal.shade800, fontSize: 13),
              )),
            ]),
          ),
          const SizedBox(height: 24),

          const Text('Target Warehouse',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          _loadingWh
              ? const Center(child: CircularProgressIndicator())
              : DropdownButtonFormField<int>(
                  initialValue: _selectedWarehouseId,
                  hint: const Text('Select warehouse'),
                  items: _warehouses.map((w) => DropdownMenuItem<int>(
                    value: w['id'] as int?,
                    child: Text('${w["name"]} — ${w["city"]}  [${w["code"]}]'),
                  )).toList(),
                  onChanged: (v) => setState(() => _selectedWarehouseId = v),
                  decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.warehouse_outlined)),
                ),
          const SizedBox(height: 20),

          const Text('Reason for Transfer',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          TextField(
            controller: _reasonCtrl,
            maxLines: 4,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Explain why you want to transfer (optional)...',
            ),
          ),
          const SizedBox(height: 28),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              icon: _loading
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.send_outlined),
              label: Text(_loading ? 'Submitting...' : 'Submit Transfer Request',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              onPressed: _loading ? null : _submitRequest,
            ),
          ),
        ]),
      ),
    );
  }
}