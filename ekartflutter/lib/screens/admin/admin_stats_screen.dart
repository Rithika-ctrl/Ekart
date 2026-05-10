import 'package:flutter/material.dart';
import '../../services/services.dart';

class AdminStatsScreen extends StatefulWidget {
  const AdminStatsScreen({super.key});
  @override
  State<AdminStatsScreen> createState() => _AdminStatsScreenState();
}

class _AdminStatsScreenState extends State<AdminStatsScreen> {
  Map<String, dynamic> _stats = {};
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await AdminService.getStats();
    if (!mounted) return;
    setState(() { _stats = res['success'] == true ? res : {}; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(14),
              children: [
                _sectionTitle('Platform Overview'),
                _grid([
                  _stat('${_stats['totalCustomers'] ?? 0}', 'Customers', Icons.people, Colors.blue),
                  _stat('${_stats['totalVendors'] ?? 0}', 'Vendors', Icons.store, Colors.indigo),
                  _stat('${_stats['totalOrders'] ?? 0}', 'Orders', Icons.receipt_long, Colors.teal),
                  _stat('₹${(_stats['totalRevenue'] ?? 0).toStringAsFixed(0)}', 'Revenue', Icons.currency_rupee, Colors.green),
                ]),
                const SizedBox(height: 14),
                _sectionTitle('Pending Actions'),
                _grid([
                  _stat('${_stats['pendingProducts'] ?? 0}', 'Pending Products', Icons.inventory_2_outlined, Colors.orange),
                  _stat('${_stats['pendingOrders'] ?? 0}', 'Pending Orders', Icons.hourglass_top, Colors.amber),
                  _stat('${_stats['pendingApprovals'] ?? 0}', 'Delivery Approvals', Icons.delivery_dining, Colors.red),
                  _stat('${_stats['pendingWHChanges'] ?? 0}', 'WH Requests', Icons.warehouse, Colors.purple),
                ]),
                const SizedBox(height: 14),
                _sectionTitle('Content'),
                _grid([
                  _stat('${_stats['totalProducts'] ?? 0}', 'Products', Icons.shopping_bag, Colors.cyan),
                  _stat('${_stats['totalDeliveryBoys'] ?? 0}', 'Delivery Boys', Icons.moped, Colors.teal),
                  _stat('${_stats['totalReviews'] ?? 0}', 'Reviews', Icons.star, Colors.amber),
                  _stat('${_stats['totalBanners'] ?? 0}', 'Banners', Icons.image, Colors.pink),
                ]),
              ],
            ),
          );
  }

  Widget _sectionTitle(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(t, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black54)),
  );

  Widget _grid(List<Widget> children) => GridView.count(
    crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
    childAspectRatio: 2.2, mainAxisSpacing: 8, crossAxisSpacing: 8,
    children: children,
  );

  Widget _stat(String value, String label, IconData icon, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Row(children: [
      Icon(icon, color: color, size: 26),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.black54), overflow: TextOverflow.ellipsis),
      ])),
    ]),
  );
}