import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminReviewsScreen extends StatefulWidget {
  const AdminReviewsScreen({super.key});
  @override
  State<AdminReviewsScreen> createState() => _AdminReviewsScreenState();
}

class _AdminReviewsScreenState extends State<AdminReviewsScreen> {
  List<Map<String, dynamic>> _reviews = [];
  Map<String, dynamic> _meta = {};
  bool _loading = true;
  String _filter = 'all';
  final _searchCtrl = TextEditingController();

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await AdminService.getReviews(filter: _filter, search: _searchCtrl.text.trim());
    if (!mounted) return;
    setState(() {
      _reviews = res['success'] == true ? List<Map<String, dynamic>>.from(res['reviews'] ?? []) : [];
      _meta    = res;
      _loading = false;
    });
  }

  void _snack(String msg, Color c) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: c, behavior: SnackBarBehavior.floating));

  Future<void> _delete(int id) async {
    final r = await AdminService.deleteReview(id);
    _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
    if (r['success'] == true) _load();
  }

  Future<void> _bulkDelete() async {
    final ctrl = TextEditingController();
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Bulk Delete Reviews'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Delete all reviews for a product (exact name):'),
        const SizedBox(height: 12),
        TextField(controller: ctrl, decoration: const InputDecoration(labelText: 'Product name', border: OutlineInputBorder())),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete All')),
      ],
    ));
    if (confirmed != true || ctrl.text.trim().isEmpty) return;
    final r = await AdminService.bulkDeleteReviews(ctrl.text.trim());
    _snack(r['message'] ?? 'Done', r['success'] == true ? Colors.green : Colors.red);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Stats bar
      if (_meta['success'] == true)
        Container(
          color: Colors.grey[50],
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            const Icon(Icons.star, color: Colors.amber, size: 18),
            const SizedBox(width: 4),
            Text('${_meta['avgRating'] ?? 0} avg', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(width: 12),
            Text('${_meta['total'] ?? 0} total', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const Spacer(),
            TextButton.icon(
              icon: const Icon(Icons.delete_sweep, size: 16),
              label: const Text('Bulk Delete'),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              onPressed: _bulkDelete,
            ),
          ]),
        ),
      // Search + filter
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'Search by product, customer, comment...',
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _searchCtrl.text.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _searchCtrl.clear(); _load(); })
                : null,
            isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
          onSubmitted: (_) => _load(),
        ),
      ),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(children: ['all', '5', '4', '3', '2', '1'].map((f) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilterChip(
            label: Text(f == 'all' ? 'All' : '$f ⭐'),
            selected: _filter == f,
            onSelected: (_) { setState(() => _filter = f); _load(); },
            selectedColor: Colors.amber.shade100,
          ),
        )).toList()),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: _reviews.isEmpty
                    ? const Center(child: Text('No reviews found'))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                        itemCount: _reviews.length,
                        itemBuilder: (_, i) {
                          final r = _reviews[i];
                          final rating = r['rating'] as int? ?? 0;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  Expanded(child: Text(r['productName'] ?? '',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      maxLines: 1, overflow: TextOverflow.ellipsis)),
                                  Row(children: List.generate(5, (j) => Icon(
                                    j < rating ? Icons.star : Icons.star_border,
                                    color: Colors.amber, size: 14))),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                    tooltip: 'Delete',
                                    onPressed: () => _delete(r['id']),
                                    padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                                  ),
                                ]),
                                const SizedBox(height: 4),
                                Text(r['comment'] ?? '', style: const TextStyle(fontSize: 13),
                                    maxLines: 3, overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 6),
                                Row(children: [
                                  const Icon(Icons.person_outline, size: 13, color: Colors.grey),
                                  const SizedBox(width: 4),
                                  Text(r['customerName'] ?? '', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                  const Spacer(),
                                  Text(r['createdAt'] != null && (r['createdAt'] as String).isNotEmpty
                                      ? (r['createdAt'] as String).substring(0, 10) : '',
                                      style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ]),
                              ]),
                            ),
                          );
                        },
                      ),
              ),
      ),
    ]);
  }
}