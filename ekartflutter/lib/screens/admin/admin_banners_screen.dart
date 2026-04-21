import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminBannersScreen extends StatefulWidget {
  const AdminBannersScreen({super.key});
  @override
  State<AdminBannersScreen> createState() => _AdminBannersScreenState();
}

class _AdminBannersScreenState extends State<AdminBannersScreen> {
  List<Map<String, dynamic>> _banners = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await AdminService.getBanners();
    if (!mounted) return;
    setState(() {
      _banners = res['success'] == true ? List<Map<String, dynamic>>.from(res['banners'] ?? []) : [];
      _loading = false;
    });
  }

  void _snack(String msg, Color c) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: c, behavior: SnackBarBehavior.floating));

  Future<void> _showAddDialog() async {
    final titleCtrl = TextEditingController();
    final imageCtrl = TextEditingController();
    final linkCtrl  = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add Banner'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: titleCtrl,
              decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: imageCtrl,
              decoration: const InputDecoration(labelText: 'Image URL', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: linkCtrl,
              decoration: const InputDecoration(labelText: 'Link URL (optional)', border: OutlineInputBorder())),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
        ],
      ),
    );
    if (confirmed != true || titleCtrl.text.trim().isEmpty || imageCtrl.text.trim().isEmpty) return;
    final r = await AdminService.addBanner(titleCtrl.text.trim(), imageCtrl.text.trim(), linkCtrl.text.trim());
    _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
    if (r['success'] == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Text('${_banners.length} banner${_banners.length != 1 ? 's' : ''}',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          const Spacer(),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Add Banner'),
            onPressed: _showAddDialog,
          ),
        ]),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: _banners.isEmpty
                    ? const Center(child: Text('No banners yet'))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                        itemCount: _banners.length,
                        itemBuilder: (_, i) {
                          final b = _banners[i];
                          final active    = b['active'] == true;
                          final onCustHome= b['showOnCustomerHome'] == true;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              // Image preview
                              if ((b['imageUrl'] as String? ?? '').isNotEmpty)
                                ClipRRect(
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                  child: Image.network(
                                    b['imageUrl'],
                                    height: 120, width: double.infinity, fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                        height: 80, color: Colors.grey[200],
                                        child: const Center(child: Icon(Icons.broken_image, color: Colors.grey))),
                                  ),
                                ),
                              Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Row(children: [
                                    Expanded(child: Text(b['title'] ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
                                    _badge(active ? 'Active' : 'Inactive', active ? Colors.green : Colors.grey),
                                  ]),
                                  if ((b['linkUrl'] as String? ?? '').isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(b['linkUrl'], style: const TextStyle(fontSize: 11, color: Colors.blue),
                                        maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ],
                                  const SizedBox(height: 10),
                                  Wrap(spacing: 8, children: [
                                    _actionChip(
                                      icon: active ? Icons.visibility_off : Icons.visibility,
                                      label: active ? 'Deactivate' : 'Activate',
                                      color: active ? Colors.orange : Colors.green,
                                      onTap: () async {
                                        final r = await AdminService.toggleBanner(b['id']);
                                        _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
                                        _load();
                                      },
                                    ),
                                    _actionChip(
                                      icon: onCustHome ? Icons.home_outlined : Icons.home,
                                      label: onCustHome ? 'Hide from Home' : 'Show on Home',
                                      color: onCustHome ? Colors.blue : Colors.indigo,
                                      onTap: () async {
                                        final r = await AdminService.toggleBannerCustomerHome(b['id']);
                                        _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
                                        _load();
                                      },
                                    ),
                                    _actionChip(
                                      icon: Icons.delete_outline,
                                      label: 'Delete',
                                      color: Colors.red,
                                      onTap: () async {
                                        final confirm = await showDialog<bool>(context: context,
                                          builder: (_) => AlertDialog(
                                            title: const Text('Delete Banner'),
                                            content: Text('Delete "${b['title']}"?'),
                                            actions: [
                                              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                              ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                                  onPressed: () => Navigator.pop(context, true),
                                                  child: const Text('Delete', style: TextStyle(color: Colors.white))),
                                            ],
                                          ),
                                        );
                                        if (confirm != true) return;
                                        final r = await AdminService.deleteBanner(b['id']);
                                        _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
                                        _load();
                                      },
                                    ),
                                  ]),
                                ]),
                              ),
                            ]),
                          );
                        },
                      ),
              ),
      ),
    ]);
  }

  Widget _badge(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
    child: Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
  );

  Widget _actionChip({required IconData icon, required String label, required Color color, required VoidCallback onTap}) =>
    InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          border: Border.all(color: color.withValues(alpha: 0.4)),
          borderRadius: BorderRadius.circular(20),
          color: color.withValues(alpha: 0.07),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
}