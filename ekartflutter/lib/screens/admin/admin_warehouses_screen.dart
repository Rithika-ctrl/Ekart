import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminWarehousesScreen extends StatefulWidget {
  const AdminWarehousesScreen({super.key});
  @override
  State<AdminWarehousesScreen> createState() => _AdminWarehousesScreenState();
}

class _AdminWarehousesScreenState extends State<AdminWarehousesScreen> {
  List<Map<String, dynamic>> _warehouses = [];
  List<Map<String, dynamic>> _changeRequests = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      AdminService.getWarehouses(),
      AdminService.getWarehouseChangeRequests(),
    ]);
    if (!mounted) return;
    setState(() {
      _warehouses      = results[0]['success'] == true ? List<Map<String, dynamic>>.from(results[0]['warehouses'] ?? []) : [];
      _changeRequests  = results[1]['success'] == true ? List<Map<String, dynamic>>.from(results[1]['requests']  ?? []) : [];
      _loading = false;
    });
  }

  void _snack(String msg, Color c) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: c, behavior: SnackBarBehavior.floating));

  Future<void> _showAddWarehouse() async {
    final nameCtrl  = TextEditingController();
    final cityCtrl  = TextEditingController();
    final stateCtrl = TextEditingController();
    final pinsCtrl  = TextEditingController();
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Add Warehouse'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        _field(nameCtrl,  'Warehouse Name *'),
        const SizedBox(height: 10),
        _field(cityCtrl,  'City *'),
        const SizedBox(height: 10),
        _field(stateCtrl, 'State'),
        const SizedBox(height: 10),
        _field(pinsCtrl,  'Served Pincodes (comma-separated)'),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
      ],
    ));
    if (confirmed != true) return;
    if (nameCtrl.text.trim().isEmpty || cityCtrl.text.trim().isEmpty) {
      _snack('Name and city are required', Colors.red); return;
    }
    final r = await AdminService.addWarehouse(nameCtrl.text.trim(), cityCtrl.text.trim(), stateCtrl.text.trim(), pinsCtrl.text.trim());
    _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
    if (r['success'] == true) _load();
  }

  Future<void> _showBoys(Map<String, dynamic> wh) async {
    final res = await AdminService.getWarehouseBoys(wh['id']);
    if (!mounted) return;
    final boys = res['success'] == true ? List<Map<String, dynamic>>.from(res['boys'] ?? []) : [];
    showModalBottomSheet(context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => DraggableScrollableSheet(expand: false, initialChildSize: 0.5, maxChildSize: 0.9,
        builder: (_, ctrl) => ListView(controller: ctrl, padding: const EdgeInsets.all(16), children: [
          Text('Delivery Boys — ${wh['name']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          if (boys.isEmpty) const Center(child: Text('No delivery boys assigned'))
          else ...boys.map((b) => ListTile(
            leading: CircleAvatar(
              backgroundColor: b['active'] == true ? Colors.teal.shade50 : Colors.grey.shade100,
              child: Text((b['name'] as String? ?? 'D')[0].toUpperCase(),
                  style: TextStyle(color: b['active'] == true ? Colors.teal : Colors.grey)),
            ),
            title: Text(b['name'] ?? ''),
            subtitle: Text('${b['deliveryBoyCode'] ?? ''} · ${b['email'] ?? ''}',
                style: const TextStyle(fontSize: 11)),
            trailing: _statusBadge(b['active'] == true && b['adminApproved'] == true),
          )),
        ]),
      ),
    );
  }

  Future<void> _handleChangeRequest(Map<String, dynamic> req, bool approve) async {
    final noteCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text(approve ? 'Approve Transfer' : 'Reject Transfer'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('${req['deliveryBoyName']} wants to transfer from '
             '"${req['currentWarehouse']}" to "${req['requestedWarehouse']}".\n'),
        if ((req['reason'] as String? ?? '').isNotEmpty)
          Text('Reason: ${req['reason']}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
        const SizedBox(height: 12),
        _field(noteCtrl, 'Admin note (optional)'),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: approve ? Colors.green : Colors.red),
          onPressed: () => Navigator.pop(context, true),
          child: Text(approve ? 'Approve' : 'Reject', style: const TextStyle(color: Colors.white)),
        ),
      ],
    ));
    if (confirmed != true) return;
    final r = approve
        ? await AdminService.approveWarehouseChangeRequest(req['id'], adminNote: noteCtrl.text.trim())
        : await AdminService.rejectWarehouseChangeRequest(req['id'],  adminNote: noteCtrl.text.trim());
    _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
    if (r['success'] == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(padding: const EdgeInsets.all(12), children: [
              // Header + add button
              Row(children: [
                Text('${_warehouses.length} Warehouse${_warehouses.length != 1 ? 's' : ''}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const Spacer(),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Add'),
                  onPressed: _showAddWarehouse,
                ),
              ]),
              const SizedBox(height: 10),
              // Warehouses list
              ..._warehouses.map((wh) {
                final active  = wh['active'] == true;
                final boyCount= wh['deliveryBoyCount'] as int? ?? 0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        const Icon(Icons.warehouse, color: Colors.teal, size: 20),
                        const SizedBox(width: 8),
                        Expanded(child: Text(wh['name'] ?? '',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
                        _statusBadge(active),
                      ]),
                      const SizedBox(height: 6),
                      Text('${wh['city']}, ${wh['state']}  •  ${wh['warehouseCode']}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      if ((wh['servedPinCodes'] as String? ?? '').isNotEmpty)
                        Text('Pins: ${wh['servedPinCodes']}',
                            style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      const SizedBox(height: 10),
                      Row(children: [
                        TextButton.icon(
                          icon: const Icon(Icons.people_outline, size: 16),
                          label: Text('$boyCount Boy${boyCount != 1 ? 's' : ''}'),
                          onPressed: () => _showBoys(wh),
                        ),
                        const Spacer(),
                        OutlinedButton.icon(
                          icon: Icon(active ? Icons.pause_circle_outline : Icons.play_circle_outline,
                              size: 16, color: active ? Colors.orange : Colors.green),
                          label: Text(active ? 'Deactivate' : 'Activate',
                              style: TextStyle(color: active ? Colors.orange : Colors.green)),
                          style: OutlinedButton.styleFrom(
                              side: BorderSide(color: active ? Colors.orange : Colors.green)),
                          onPressed: () async {
                            final r = await AdminService.toggleWarehouse(wh['id']);
                            _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
                            _load();
                          },
                        ),
                      ]),
                    ]),
                  ),
                );
              }),
              // Change requests section
              if (_changeRequests.isNotEmpty) ...[
                const Divider(height: 24),
                Row(children: [
                  const Icon(Icons.swap_horiz, color: Colors.orange, size: 18),
                  const SizedBox(width: 6),
                  Text('Pending Transfer Requests (${_changeRequests.length})',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ]),
                const SizedBox(height: 10),
                ..._changeRequests.map((req) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  color: Colors.orange.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(req['deliveryBoyName'] ?? '',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('${req['deliveryBoyCode'] ?? ''}',
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      const SizedBox(height: 6),
                      Row(children: [
                        const Icon(Icons.arrow_forward, size: 14, color: Colors.orange),
                        const SizedBox(width: 4),
                        Text('${req['currentWarehouse']} → ${req['requestedWarehouse']}',
                            style: const TextStyle(fontSize: 13)),
                      ]),
                      if ((req['reason'] as String? ?? '').isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Reason: ${req['reason']}',
                              style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ),
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(child: OutlinedButton(
                          style: OutlinedButton.styleFrom(foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red)),
                          onPressed: () => _handleChangeRequest(req, false),
                          child: const Text('Reject'),
                        )),
                        const SizedBox(width: 8),
                        Expanded(child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                          onPressed: () => _handleChangeRequest(req, true),
                          child: const Text('Approve', style: TextStyle(color: Colors.white)),
                        )),
                      ]),
                    ]),
                  ),
                )),
              ],
            ]),
          );
  }

  Widget _field(TextEditingController ctrl, String label) => TextField(
    controller: ctrl,
    decoration: InputDecoration(labelText: label, border: const OutlineInputBorder(), isDense: true),
  );

  Widget _statusBadge(bool active) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
        color: active ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(12)),
    child: Text(active ? 'Active' : 'Inactive',
        style: TextStyle(fontSize: 11, color: active ? Colors.green : Colors.red, fontWeight: FontWeight.w600)),
  );
}