import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminAccountsScreen extends StatefulWidget {
  const AdminAccountsScreen({super.key});
  @override
  State<AdminAccountsScreen> createState() => _AdminAccountsScreenState();
}

class _AdminAccountsScreenState extends State<AdminAccountsScreen> {
  List<Map<String, dynamic>> _accounts = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  final _searchCtrl = TextEditingController();
  String _filter = 'all'; // all | customer | vendor | delivery

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Future<void> _load([String? search]) async {
    setState(() => _loading = true);
    final results = await Future.wait([
      AdminService.getAccounts(search: search),
      AdminService.getAccountStats(),
    ]);
    if (!mounted) return;
    final acc = results[0]; final st = results[1];
    setState(() {
      _accounts = acc['success'] == true ? List<Map<String, dynamic>>.from(acc['accounts'] ?? []) : [];
      _stats    = st['success']  == true ? st : {};
      _loading  = false;
    });
  }

  void _snack(String msg, Color color) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'all') return _accounts;
    return _accounts.where((a) => (a['role'] as String? ?? '').toLowerCase() == _filter).toList();
  }

  Future<void> _showProfile(Map<String, dynamic> account) async {
    final res = await AdminService.getAccountProfile(account['id']);
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => DraggableScrollableSheet(
        expand: false, initialChildSize: 0.6, maxChildSize: 0.9,
        builder: (_, ctrl) => ListView(controller: ctrl, padding: const EdgeInsets.all(20), children: [
          Center(child: CircleAvatar(radius: 28, backgroundColor: Colors.red.shade100,
              child: Text((account['name'] as String? ?? 'U')[0].toUpperCase(),
                  style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold, fontSize: 22)))),
          const SizedBox(height: 10),
          Center(child: Text(account['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
          Center(child: Text(account['email'] ?? '', style: const TextStyle(color: Colors.grey))),
          const Divider(height: 28),
          if (res['success'] == true) ...[
            _profileRow('Role', res['role'] ?? ''),
            _profileRow('Mobile', '${res['mobile'] ?? 'N/A'}'),
            _profileRow('Joined', res['joinedDate'] ?? ''),
            _profileRow('Total Orders', '${res['totalOrders'] ?? 0}'),
            _profileRow('Total Spent', '₹${res['totalSpent'] ?? 0}'),
            _profileRow('Status', account['active'] == true ? 'Active' : 'Banned'),
          ] else
            const Center(child: Text('Could not load profile')),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: OutlinedButton.icon(
              icon: const Icon(Icons.lock_reset, size: 16),
              label: const Text('Reset Password'),
              onPressed: () async {
                Navigator.pop(context);
                final r = await AdminService.resetAccountPassword(account['id']);
                _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
              },
            )),
            const SizedBox(width: 8),
            Expanded(child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              icon: const Icon(Icons.delete_outline, size: 16, color: Colors.white),
              label: const Text('Delete', style: TextStyle(color: Colors.white)),
              onPressed: () async {
                Navigator.pop(context);
                final confirm = await _confirmDialog('Delete account of ${account['name']}?');
                if (confirm != true) return;
                final r = await AdminService.deleteAccount(account['id']);
                _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
                _load();
              },
            )),
          ]),
        ]),
      ),
    );
  }

  Future<bool?> _confirmDialog(String msg) => showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Confirm'),
      content: Text(msg),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
      ],
    ),
  );

  Widget _profileRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
    ]),
  );

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    return Column(children: [
      // Stats row
      if (_stats.isNotEmpty)
        Container(
          color: Colors.grey[50],
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            _miniStat('${_stats['totalCustomers'] ?? 0}', 'Customers', Colors.blue),
            _miniStat('${_stats['totalVendors'] ?? 0}', 'Vendors', Colors.indigo),
            _miniStat('${_stats['activeAccounts'] ?? 0}', 'Active', Colors.green),
            _miniStat('${_stats['bannedAccounts'] ?? 0}', 'Banned', Colors.red),
          ]),
        ),
      // Search bar
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'Search by name or email...',
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _searchCtrl.text.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _searchCtrl.clear(); _load(); })
                : null,
            isDense: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
          onSubmitted: (v) => _load(v.trim().isEmpty ? null : v.trim()),
        ),
      ),
      // Filter chips
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(children: ['all', 'customer', 'vendor', 'delivery_boy'].map((f) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilterChip(
            label: Text(f == 'all' ? 'All' : f == 'delivery_boy' ? 'Delivery' : f[0].toUpperCase() + f.substring(1)),
            selected: _filter == f,
            onSelected: (_) => setState(() => _filter = f),
            selectedColor: Colors.red.shade100,
          ),
        )).toList()),
      ),
      // List
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: filtered.isEmpty
                    ? const Center(child: Text('No accounts found'))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final a = filtered[i];
                          final active = a['active'] == true;
                          final role   = (a['role'] as String? ?? 'customer').toLowerCase();
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: active ? Colors.blue.shade50 : Colors.grey.shade200,
                                child: Text(
                                  (a['name'] as String? ?? 'U').isNotEmpty ? (a['name'] as String)[0].toUpperCase() : 'U',
                                  style: TextStyle(color: active ? Colors.blue.shade700 : Colors.grey, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Text(a['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(a['email'] ?? '', style: const TextStyle(fontSize: 12)),
                                Row(children: [
                                  _roleBadge(role),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: active ? Colors.green.shade50 : Colors.red.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(active ? 'Active' : 'Banned',
                                        style: TextStyle(fontSize: 10, color: active ? Colors.green : Colors.red)),
                                  ),
                                ]),
                              ]),
                              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                IconButton(
                                  icon: const Icon(Icons.info_outline, size: 20),
                                  onPressed: () => _showProfile(a),
                                  tooltip: 'View Profile',
                                ),
                                IconButton(
                                  icon: Icon(active ? Icons.block : Icons.check_circle_outline,
                                      color: active ? Colors.red : Colors.green, size: 20),
                                  tooltip: active ? 'Ban' : 'Unban',
                                  onPressed: () async {
                                    final r = await AdminService.toggleAccount(a['id'], !active);
                                    _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
                                    _load();
                                  },
                                ),
                              ]),
                            ),
                          );
                        },
                      ),
              ),
      ),
    ]);
  }

  Widget _miniStat(String value, String label, Color color) => Expanded(child: Column(children: [
    Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
    Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
  ]));

  Widget _roleBadge(String role) {
    final colors = {'customer': Colors.blue, 'vendor': Colors.indigo, 'delivery_boy': Colors.teal, 'admin': Colors.red};
    final c = colors[role] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(role.replaceAll('_', ' '), style: TextStyle(fontSize: 10, color: c, fontWeight: FontWeight.w600)),
    );
  }
}