import 'package:flutter/material.dart';
import '../../models/product_model.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../login_screen.dart';
import 'add_edit_product_screen.dart';
import 'vendor_profile_screen.dart';
import 'vendor_sales_report_screen.dart';
import 'stock_alerts_screen.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});
  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  int    _tab     = 0;
  Map<String, dynamic>? stats;
  List<Product>              products = [];
  List<Map<String, dynamic>> orders   = [];
  List<Map<String, dynamic>> alerts   = [];
  Map<String, dynamic>?      profile;
  bool loading = true;

  static const _tabs = ['Dashboard', 'Products', 'Orders', 'Storefront', 'Alerts'];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    final results = await Future.wait([
      VendorService.getStats(),
      VendorService.getProducts(),
      VendorService.getOrders(),
      VendorService.getStockAlerts(),
      VendorService.getProfile(),
    ]);
    if (!mounted) return;
    setState(() {
      final s  = results[0] as Map<String, dynamic>;
      stats    = s['success'] == true ? s : null;
      products = results[1] as List<Product>;
      orders   = results[2] as List<Map<String, dynamic>>;
      final a  = results[3] as Map<String, dynamic>;
      alerts   = a['success'] == true
          ? List<Map<String, dynamic>>.from(a['alerts'] ?? []) : [];
      profile  = results[4] as Map<String, dynamic>?;
      loading  = false;
    });
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color,
        behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    final unackAlerts = alerts.where((a) => a['acknowledged'] == false).length;
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Icon(Icons.store, color: Colors.white),
          const SizedBox(width: 8),
          const Text('Vendor Dashboard',
              style: TextStyle(fontWeight: FontWeight.bold)),
          if (unackAlerts > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
              child: Text('$unackAlerts',
                  style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
          ],
        ]),
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart),
            tooltip: 'Sales Report',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const VendorSalesReportScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Profile',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const VendorProfileScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              AuthService.logout();
              Navigator.pushAndRemoveUntil(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false);
            },
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
              // Tab bar
              Container(
                color: Colors.indigo.shade700,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _tabs.asMap().entries.map((e) {
                      final selected = _tab == e.key;
                      final isAlerts = e.value == 'Alerts';
                      return GestureDetector(
                        onTap: () => setState(() => _tab = e.key),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: selected ? Colors.white : Colors.transparent,
                                width: 3,
                              ),
                            ),
                          ),
                          child: Row(children: [
                            Text(e.value,
                                style: TextStyle(
                                    color: selected ? Colors.white : Colors.white60,
                                    fontWeight: selected
                                        ? FontWeight.bold : FontWeight.normal,
                                    fontSize: 13)),
                            if (isAlerts && unackAlerts > 0) ...[
                              const SizedBox(width: 4),
                              Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                    color: Colors.red, shape: BoxShape.circle),
                                child: Text('$unackAlerts',
                                    style: const TextStyle(
                                        color: Colors.white, fontSize: 9)),
                              ),
                            ],
                          ]),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: [
                    _buildDashboard(),
                    _buildProducts(),
                    _buildOrders(),
                    _buildStorefront(),
                    _buildAlerts(),
                  ][_tab],
                ),
              ),
            ]),
      floatingActionButton: _tab == 1
          ? FloatingActionButton.extended(
              backgroundColor: Colors.indigo.shade700,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Add Product'),
              onPressed: () async {
                await Navigator.push(context,
                    MaterialPageRoute(
                        builder: (_) => const AddEditProductScreen()));
                _load();
              },
            )
          : null,
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  Widget _buildDashboard() {
    if (stats == null) {
      return const Center(child: Text('Could not load stats'));
    }
    final totalProducts = stats!['totalProducts'] ?? 0;
    final totalOrders   = stats!['totalOrders']   ?? 0;
    final totalRevenue  = (stats!['totalRevenue']  ?? 0).toDouble();
    final pendingOrders = stats!['pendingOrders']  ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Welcome card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
                colors: [Colors.indigo.shade700, Colors.indigo.shade500]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Welcome back,',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
            Text(AuthService.currentUser?.name ?? 'Vendor',
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
            if (AuthService.currentUser?.vendorCode != null)
              Text('Code: ${AuthService.currentUser!.vendorCode}',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12)),
          ]),
        ),
        const SizedBox(height: 16),

        // Stats grid
        GridView.count(
          crossAxisCount: 2, shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12, mainAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _statCard('Products', '$totalProducts', Icons.inventory_2,
                Colors.blue),
            _statCard('Total Orders', '$totalOrders', Icons.shopping_bag,
                Colors.green),
            _statCard('Pending', '$pendingOrders', Icons.pending_actions,
                Colors.orange),
            _statCard('Revenue', '₹${totalRevenue.toStringAsFixed(0)}',
                Icons.currency_rupee, Colors.purple),
          ],
        ),
        const SizedBox(height: 16),

        // Quick actions
        const Text('Quick Actions',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _actionBtn(Icons.add_box_outlined, 'Add Product',
              Colors.indigo, () { setState(() => _tab = 1); })),
          const SizedBox(width: 10),
          Expanded(child: _actionBtn(Icons.list_alt_outlined, 'View Orders',
              Colors.green, () { setState(() => _tab = 2); })),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _actionBtn(Icons.storefront_outlined, 'Storefront',
              Colors.teal, () { setState(() => _tab = 3); })),
          const SizedBox(width: 10),
          Expanded(child: _actionBtn(Icons.bar_chart_outlined, 'Sales Report',
              Colors.purple, () => Navigator.push(context,
                  MaterialPageRoute(
                      builder: (_) => const VendorSalesReportScreen())))),
        ]),

        if (unackAlerts > 0) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.red.shade50, borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.red.shade200)),
            child: Row(children: [
              Icon(Icons.warning_amber, color: Colors.red.shade700),
              const SizedBox(width: 8),
              Expanded(child: Text(
                '$unackAlerts stock alert${unackAlerts > 1 ? 's' : ''} need attention',
                style: TextStyle(color: Colors.red.shade700),
              )),
              TextButton(
                onPressed: () => setState(() => _tab = 4),
                child: const Text('View'),
              ),
            ]),
          ),
        ],
      ]),
    );
  }

  int get unackAlerts => alerts.where((a) => a['acknowledged'] == false).length;

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: color, size: 22),
        const Spacer(),
        Text(value, style: TextStyle(
            fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
      ]),
    );
  }

  Widget _actionBtn(
      IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(children: [
          Icon(icon, color: color),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
        ]),
      ),
    );
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  Widget _buildProducts() {
    if (products.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 12),
        Text('No products yet', style: TextStyle(color: Colors.grey[500])),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          icon: const Icon(Icons.add),
          label: const Text('Add First Product'),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo.shade700,
              foregroundColor: Colors.white),
          onPressed: () async {
            await Navigator.push(context,
                MaterialPageRoute(builder: (_) => const AddEditProductScreen()));
            _load();
          },
        ),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: products.length,
      itemBuilder: (ctx, i) {
        final p = products[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            leading: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.network(p.imageLink,
                  width: 50, height: 50, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                      width: 50, height: 50, color: Colors.grey[200],
                      child: const Icon(Icons.image_not_supported))),
            ),
            title: Text(p.name,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(
              '₹${p.price.toStringAsFixed(2)} • Stock: ${p.stock} • ${p.category}',
              style: const TextStyle(fontSize: 12),
            ),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: p.approved
                      ? Colors.green.shade100 : Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(p.approved ? 'Approved' : 'Pending',
                    style: TextStyle(
                        fontSize: 10,
                        color: p.approved
                            ? Colors.green.shade800 : Colors.orange.shade800)),
              ),
              const SizedBox(width: 4),
              PopupMenuButton<String>(
                onSelected: (action) async {
                  if (action == 'edit') {
                    await Navigator.push(context,
                        MaterialPageRoute(
                            builder: (_) => AddEditProductScreen(product: p)));
                    _load();
                  } else if (action == 'delete') {
                    final confirmed = await _confirmDelete(p.name);
                    if (confirmed == true) {
                      final res = await VendorService.deleteProduct(p.id);
                      _snack(res['message'] ?? 'Done',
                          res['success'] == true ? Colors.green : Colors.red);
                      if (res['success'] == true) _load();
                    }
                  }
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'edit',
                      child: ListTile(dense: true, leading: Icon(Icons.edit),
                          title: Text('Edit'))),
                  const PopupMenuItem(value: 'delete',
                      child: ListTile(dense: true,
                          leading: Icon(Icons.delete, color: Colors.red),
                          title: Text('Delete',
                              style: TextStyle(color: Colors.red)))),
                ],
              ),
            ]),
          ),
        );
      },
    );
  }

  Future<bool?> _confirmDelete(String name) => showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Delete Product'),
      content: Text('Are you sure you want to delete "$name"?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel')),
        TextButton(
          style: TextButton.styleFrom(foregroundColor: Colors.red),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Delete'),
        ),
      ],
    ),
  );

  // ── ORDERS ────────────────────────────────────────────────────────────────
  Widget _buildOrders() {
    if (orders.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 12),
        Text('No orders yet', style: TextStyle(color: Colors.grey[500])),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: orders.length,
      itemBuilder: (ctx, i) {
        final o = orders[i];
        final status  = o['trackingStatus']        as String? ?? '';
        final orderId = o['id']                    as int?    ?? 0;
        final total   = (o['totalPrice'] as num?   ?? 0).toDouble();
        final items   = List<Map<String, dynamic>>.from(o['items'] ?? []);
        final canMarkReady = status == 'PROCESSING';

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('Order #$orderId',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                _statusBadge(status),
              ]),
              const SizedBox(height: 6),
              Row(children: [
                Text('${items.length} item(s) • ₹${total.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 13)),
                const SizedBox(width: 8),
                // ── Payment mode badge ─────────────────────────────────
                if ((o['paymentMode'] as String? ?? '').isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(5),
                      border: Border.all(color: Colors.amber.shade300),
                    ),
                    child: Text(
                      '💳 ${o['paymentMode']}',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.amber.shade800),
                    ),
                  ),
              ]),
              const SizedBox(height: 4),
              ...items.take(2).map((item) => Text(
                    '• ${item['name']} × ${item['quantity']}',
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  )),
              if (items.length > 2)
                Text('  +${items.length - 2} more',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              if (canMarkReady) ...[
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade600,
                        foregroundColor: Colors.white),
                    icon: const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text('Mark Ready for Pickup'),
                    onPressed: () async {
                      final res = await VendorService.markOrderReady(orderId);
                      _snack(
                          res['message'] ?? (res['success'] == true
                              ? 'Marked ready' : 'Failed'),
                          res['success'] == true ? Colors.green : Colors.red);
                      if (res['success'] == true) _load();
                    },
                  ),
                ),
              ],
            ]),
          ),
        );
      },
    );
  }

  Widget _statusBadge(String status) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12)),
      child: Text(status.replaceAll('_', ' '),
          style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'PROCESSING':  return Colors.orange;
      case 'SHIPPED':     return Colors.blue;
      case 'DELIVERED':   return Colors.green;
      case 'CANCELLED':   return Colors.red;
      default:            return Colors.grey;
    }
  }

  // ── STOREFRONT ────────────────────────────────────────────────────────────
  Widget _buildStorefront() {
    final nameCtrl   = TextEditingController(
        text: profile?['name']   as String? ?? AuthService.currentUser?.name ?? '');
    final mobileCtrl = TextEditingController(
        text: '${profile?['mobile'] ?? ''}');
    final email      = profile?['email']  as String? ?? '';
    final code       = profile?['vendorCode'] as String? ??
        AuthService.currentUser?.vendorCode ?? '';
    bool saving = false;

    return StatefulBuilder(builder: (ctx, setS) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Banner / header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                  colors: [Colors.indigo.shade700, Colors.indigo.shade400]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(children: [
              CircleAvatar(
                radius: 34,
                backgroundColor: Colors.white24,
                child: Text(
                  (nameCtrl.text.isEmpty ? 'V' : nameCtrl.text[0]).toUpperCase(),
                  style: const TextStyle(
                      color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 10),
              Text(nameCtrl.text,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              if (code.isNotEmpty)
                Text('Vendor Code: $code',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
            ]),
          ),
          const SizedBox(height: 24),

          const Text('Store Information',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),

          // Email (readonly)
          _infoRow(Icons.email_outlined, 'Email', email),
          const SizedBox(height: 8),
          _infoRow(Icons.qr_code, 'Vendor Code', code),
          const SizedBox(height: 16),

          // Editable fields
          const Text('Update Details',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 10),

          TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Store / Display Name',
              prefixIcon: Icon(Icons.store_outlined),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: mobileCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile Number',
              prefixIcon: Icon(Icons.phone_outlined),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              icon: saving
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.save_outlined),
              label: Text(saving ? 'Saving...' : 'Update Storefront'),
              onPressed: saving ? null : () async {
                setS(() => saving = true);
                final res = await VendorService.updateProfile({
                  'name':   nameCtrl.text.trim(),
                  'mobile': mobileCtrl.text.trim(),
                });
                setS(() => saving = false);
                _snack(
                  res['message'] ?? (res['success'] == true
                      ? 'Storefront updated!' : 'Update failed'),
                  res['success'] == true ? Colors.green : Colors.red,
                );
                if (res['success'] == true) _load();
              },
            ),
          ),

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 12),

          // Stats summary
          const Text('Store Stats',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _miniStat(
                '${products.length}', 'Products',
                products.where((p) => p.approved).length == products.length
                    ? Colors.green : Colors.orange)),
            const SizedBox(width: 10),
            Expanded(child: _miniStat(
                '${orders.length}', 'Orders', Colors.blue)),
            const SizedBox(width: 10),
            Expanded(child: _miniStat(
                '${products.where((p) => p.approved).length}',
                'Approved', Colors.green)),
          ]),
        ]),
      );
    });
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(children: [
      Icon(icon, size: 18, color: Colors.grey),
      const SizedBox(width: 8),
      Text('$label: ', style: const TextStyle(color: Colors.grey, fontSize: 13)),
      Expanded(child: Text(value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
    ]);
  }

  Widget _miniStat(String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        Text(value, style: TextStyle(
            fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 11)),
      ]),
    );
  }

  // ── ALERTS ────────────────────────────────────────────────────────────────
  Widget _buildAlerts() {
    return StockAlertsScreen(
      alerts: alerts,
      onAcknowledge: (id) async {
        final res = await VendorService.acknowledgeAlert(id);
        _snack(res['message'] ?? 'Done',
            res['success'] == true ? Colors.green : Colors.red);
        if (res['success'] == true) _load();
      },
    );
  }
}