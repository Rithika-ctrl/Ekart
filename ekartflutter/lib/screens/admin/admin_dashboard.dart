import 'package:flutter/material.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../login_screen.dart';
import 'admin_coupon_screen.dart';
import 'admin_refund_screen.dart';
import 'admin_delivery_screen.dart';
import 'admin_stats_screen.dart';
import 'admin_accounts_screen.dart';
import 'admin_reviews_screen.dart';
import 'admin_banners_screen.dart';
import 'admin_warehouses_screen.dart';
// ── NEW screens (React feature parity) ─────────────────────────────────────
import 'admin_settlement_screen.dart';
import 'admin_user_activity_screen.dart';
import 'admin_category_screen.dart';
import 'admin_policies_screen.dart';
import 'admin_delivery_load_board.dart';
import 'admin_order_detail_sheet.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});
  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _tab = 0;
  List<Map<String, dynamic>> products  = [];
  List<Map<String, dynamic>> customers = [];
  List<Map<String, dynamic>> vendors   = [];
  List<Map<String, dynamic>> orders    = [];
  bool loading = true;

  // Product filter + search
  String _productFilter = 'pending';
  String _productSearch = '';

  // Order filter + search
  String _orderStatusFilter = '';
  String _orderSearch = '';

  static const List<String> _statuses = [
    'PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
  ];

  static const Map<String, Color> _statusColors = {
    'PLACED':            Color(0xFFD97706),
    'CONFIRMED':         Color(0xFF2563EB),
    'PACKED':            Color(0xFF0891B2),
    'SHIPPED':           Color(0xFF0284C7),
    'OUT_FOR_DELIVERY':  Color(0xFF7C3AED),
    'DELIVERED':         Color(0xFF16A34A),
    'CANCELLED':         Color(0xFFDC2626),
  };

  static const _tabs = [
    ('Dashboard',     Icons.dashboard_outlined),
    ('Products',      Icons.inventory_2_outlined),
    ('Customers',     Icons.people_outline),
    ('Vendors',       Icons.store_outlined),
    ('Orders',        Icons.receipt_long_outlined),
    ('Coupons',       Icons.discount_outlined),
    ('Refunds',       Icons.assignment_return_outlined),
    ('Delivery',      Icons.delivery_dining_outlined),
    ('Load Board',    Icons.speed_outlined),
    ('Warehouses',    Icons.warehouse_outlined),
    ('Categories',    Icons.category_outlined),
    ('Banners',       Icons.image_outlined),
    ('Reviews',       Icons.star_outline),
    ('Accounts',      Icons.manage_accounts_outlined),
    ('Settlement',    Icons.payments_outlined),
    ('User Activity', Icons.timeline_outlined),
    ('Policies',      Icons.policy_outlined),
  ];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    final results = await Future.wait([
      AdminService.getProducts(),
      AdminService.getUsers(),
      AdminService.getOrders(),
    ]);
    if (!mounted) return;
    setState(() {
      products  = results[0]['success'] == true ? List<Map<String, dynamic>>.from(results[0]['products']   ?? []) : [];
      customers = results[1]['success'] == true ? List<Map<String, dynamic>>.from(results[1]['customers'] ?? []) : [];
      vendors   = results[1]['success'] == true ? List<Map<String, dynamic>>.from(results[1]['vendors']   ?? []) : [];
      orders    = results[2]['success'] == true ? List<Map<String, dynamic>>.from(results[2]['orders']    ?? []) : [];
      loading   = false;
    });
  }

  void _snack(String msg, Color color) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));

  Future<void> _approveProduct(int id) async {
    final res = await AdminService.approveProduct(id);
    _snack(res['message'] ?? 'Approved ✓', res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _load();
  }

  Future<void> _rejectProduct(int id) async {
    final res = await AdminService.rejectProduct(id);
    _snack(res['message'] ?? 'Rejected', res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _load();
  }

  Future<void> _updateOrderStatus(int id, String status) async {
    final res = await AdminService.updateOrderStatus(id, status);
    _snack(res['message'] ?? 'Updated', res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _load();
  }

  Future<void> _cancelOrder(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Order?'),
        content: Text('Cancel Order #$id?\n\nThis restores stock and emails the customer. Cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel Order'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final res = await AdminService.updateOrderStatus(id, 'CANCELLED');
    _snack(res['message'] ?? (res['success'] == true ? 'Cancelled' : 'Failed'),
        res['success'] == true ? Colors.green : Colors.red);
    if (res['success'] == true) _load();
  }

  void _openOrderDetail(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AdminOrderDetailSheet(
        order: order,
        onUpdateStatus: _updateOrderStatus,
        onCancelOrder: _cancelOrder,
      ),
    );
  }

  void _openProductDetail(Map<String, dynamic> p) {
    final images = <String>[];
    if (p['imageLink'] != null) images.add(p['imageLink'].toString());
    if (p['extraImageLinks'] != null) {
      p['extraImageLinks'].toString().split(',')
          .map((s) => s.trim()).where((s) => s.isNotEmpty).forEach(images.add);
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ProductDetailSheet(
        product: p,
        images: images,
        onApprove: () { Navigator.pop(ctx); _approveProduct(p['id'] as int); },
        onReject:  () { Navigator.pop(ctx); _rejectProduct(p['id'] as int); },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pending = products.where((p) => p['approved'] == false).length;
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Icon(Icons.admin_panel_settings, color: Colors.white),
          const SizedBox(width: 8),
          const Text('Admin Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
          if (pending > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(5),
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: Text('$pending',
                  style: TextStyle(color: Colors.red.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ]),
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              AuthService.logout();
              Navigator.pushAndRemoveUntil(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
            },
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
              // Scrollable tab bar
              Container(
                color: Colors.red.shade700,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _tabs.asMap().entries.map((e) {
                      final selected = _tab == e.key;
                      return GestureDetector(
                        onTap: () => setState(() => _tab = e.key),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                          decoration: BoxDecoration(
                            border: Border(bottom: BorderSide(
                                color: selected ? Colors.white : Colors.transparent, width: 3)),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(e.value.$2, color: selected ? Colors.white : Colors.white54, size: 16),
                            const SizedBox(width: 5),
                            Text(e.value.$1,
                                style: TextStyle(
                                    color: selected ? Colors.white : Colors.white60,
                                    fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                                    fontSize: 13)),
                          ]),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              // Tab content
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: IndexedStack(
                    index: _tab,
                    children: [
                      const AdminStatsScreen(),             //  0 Dashboard
                      _buildProducts(),                     //  1 Products
                      _buildCustomers(),                    //  2 Customers
                      _buildVendors(),                      //  3 Vendors
                      _buildOrders(),                       //  4 Orders
                      const AdminCouponScreen(),            //  5 Coupons
                      const AdminRefundScreen(),            //  6 Refunds
                      const AdminDeliveryScreen(),          //  7 Delivery
                      const AdminDeliveryLoadBoardScreen(), //  8 Load Board  [NEW]
                      const AdminWarehousesScreen(),        //  9 Warehouses
                      const AdminCategoryScreen(),          // 10 Categories   [NEW]
                      const AdminBannersScreen(),           // 11 Banners
                      const AdminReviewsScreen(),           // 12 Reviews
                      const AdminAccountsScreen(),          // 13 Accounts
                      const AdminSettlementScreen(),        // 14 Settlement   [NEW]
                      const AdminUserActivityScreen(),      // 15 User Activity [NEW]
                      const AdminPoliciesScreen(),          // 16 Policies     [NEW]
                    ],
                  ),
                ),
              ),
            ]),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTS — filter pills + search + image gallery tap
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildProducts() {
    final pendingCount  = products.where((p) => p['approved'] == false).length;
    final approvedCount = products.where((p) => p['approved'] == true).length;

    List<Map<String, dynamic>> byStatus;
    switch (_productFilter) {
      case 'pending':  byStatus = products.where((p) => p['approved'] == false).toList(); break;
      case 'approved': byStatus = products.where((p) => p['approved'] == true).toList();  break;
      default:         byStatus = List.from(products);
    }

    final q = _productSearch.toLowerCase().trim();
    final filtered = q.isEmpty ? byStatus : byStatus.where((p) =>
        (p['name'] ?? '').toString().toLowerCase().contains(q)
     || (p['vendorName'] ?? '').toString().toLowerCase().contains(q)
     || (p['category'] ?? '').toString().toLowerCase().contains(q)
     || p['id'].toString().contains(q)).toList();

    return Column(children: [
      Container(
        color: Colors.grey.shade50,
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
        child: Column(children: [
          TextField(
            onChanged: (v) => setState(() => _productSearch = v),
            decoration: InputDecoration(
              hintText: 'Search by name, vendor, category, ID…',
              prefixIcon: const Icon(Icons.search, size: 18),
              suffixIcon: _productSearch.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16),
                      onPressed: () => setState(() => _productSearch = ''))
                  : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              isDense: true,
            ),
          ),
          const SizedBox(height: 8),
          Row(children: [
            _pill('All (${ products.length})', 'all', _productFilter,
                (v) => setState(() => _productFilter = v)),
            const SizedBox(width: 6),
            _pill('Pending ($pendingCount)', 'pending', _productFilter,
                (v) => setState(() => _productFilter = v)),
            const SizedBox(width: 6),
            _pill('Approved ($approvedCount)', 'approved', _productFilter,
                (v) => setState(() => _productFilter = v)),
            const Spacer(),
            if (pendingCount > 0)
              TextButton.icon(
                icon: const Icon(Icons.done_all, size: 16),
                label: Text('Approve All ($pendingCount)'),
                style: TextButton.styleFrom(foregroundColor: Colors.green.shade700),
                onPressed: () async {
                  final res = await AdminService.approveAllProducts();
                  _snack(res['message'] ?? 'Done', res['success'] == true ? Colors.green : Colors.red);
                  _load();
                },
              ),
          ]),
        ]),
      ),
      Expanded(
        child: filtered.isEmpty
            ? Center(child: Text(q.isNotEmpty ? 'No results for "$q"' : 'No products',
                style: const TextStyle(color: Colors.grey)))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: filtered.length,
                itemBuilder: (ctx, i) => _productCard(filtered[i]),
              ),
      ),
    ]);
  }

  Widget _productCard(Map<String, dynamic> p) {
    final id        = p['id'] as int? ?? 0;
    final name      = p['name'] as String? ?? '';
    final price     = (p['price'] as num? ?? 0).toDouble();
    final stock     = p['stock'] as int? ?? 0;
    final isPending = p['approved'] == false;
    final imgUrl    = p['imageLink'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: isPending ? Colors.orange.shade50 : null,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: isPending ? BorderSide(color: Colors.orange.shade200) : BorderSide.none),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => _openProductDetail(p),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: (imgUrl != null && imgUrl.isNotEmpty)
                  ? Image.network(imgUrl, width: 56, height: 56, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _imgPlaceholder())
                  : _imgPlaceholder(),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('₹${price.toStringAsFixed(0)} · Stock: $stock · #$id',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
              if (p['category'] != null)
                Text(p['category'].toString(),
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: isPending ? Colors.orange.shade100 : Colors.green.shade100,
                    borderRadius: BorderRadius.circular(12)),
                child: Text(isPending ? 'Pending' : 'Approved',
                    style: TextStyle(
                        color: isPending ? Colors.deepOrange : Colors.green,
                        fontSize: 10, fontWeight: FontWeight.bold))),
              const SizedBox(height: 6),
              Row(mainAxisSize: MainAxisSize.min, children: [
                SizedBox(width: 28, height: 28,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      isPending ? Icons.check : Icons.close,
                      size: 18,
                      color: isPending ? Colors.green : Colors.red),
                    onPressed: isPending
                        ? () => _approveProduct(id)
                        : () => _rejectProduct(id),
                  )),
                SizedBox(width: 28, height: 28,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.visibility_outlined, size: 16, color: Colors.blue),
                    onPressed: () => _openProductDetail(p),
                  )),
              ]),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _imgPlaceholder() => Container(
      width: 56, height: 56, color: Colors.grey.shade200,
      child: const Icon(Icons.inventory_2_outlined, size: 24, color: Colors.grey));

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMERS — with role badge + verified indicator
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildCustomers() {
    if (customers.isEmpty) return const Center(child: Text('No customers found'));
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: customers.length,
      itemBuilder: (ctx, i) {
        final c        = customers[i];
        final id       = c['id'] as int? ?? 0;
        final name     = c['name'] as String? ?? '';
        final email    = c['email'] as String? ?? '';
        final mobile   = c['mobile'] as String? ?? '';
        final active   = c['active'] as bool? ?? true;
        final role     = c['role'] as String? ?? 'CUSTOMER';
        final verified = c['verified'] as bool? ?? false;
        final roleColor = role == 'ADMIN' ? Colors.purple
            : role == 'ORDER_MANAGER' ? Colors.blue : Colors.green;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: active ? Colors.blue.shade100 : Colors.grey.shade200,
              child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'C',
                  style: TextStyle(
                      color: active ? Colors.blue.shade800 : Colors.grey,
                      fontWeight: FontWeight.bold)),
            ),
            title: Row(children: [
              Expanded(child: Text(name,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  maxLines: 1, overflow: TextOverflow.ellipsis)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    color: roleColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8)),
                child: Text(role,
                    style: TextStyle(fontSize: 9, color: roleColor, fontWeight: FontWeight.bold))),
            ]),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(email, style: const TextStyle(fontSize: 11)),
              if (mobile.isNotEmpty)
                Text(mobile, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              Row(children: [
                Icon(verified ? Icons.verified_outlined : Icons.cancel_outlined,
                    size: 12, color: verified ? Colors.green : Colors.red),
                const SizedBox(width: 3),
                Text(verified ? 'Verified' : 'Unverified',
                    style: TextStyle(fontSize: 10,
                        color: verified ? Colors.green : Colors.red)),
              ]),
            ]),
            trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: active ? Colors.green.shade100 : Colors.red.shade100,
                    borderRadius: BorderRadius.circular(12)),
                child: Text(active ? 'Active' : 'Banned',
                    style: TextStyle(
                        color: active ? Colors.green : Colors.red,
                        fontSize: 10, fontWeight: FontWeight.bold))),
              const SizedBox(height: 4),
              SizedBox(width: 28, height: 28,
                child: IconButton(
                  padding: EdgeInsets.zero,
                  icon: Icon(
                    active ? Icons.block : Icons.check_circle_outline,
                    color: active ? Colors.red : Colors.green, size: 20),
                  onPressed: () async {
                    final res = await AdminService.toggleCustomer(id);
                    _snack(res['message'] ?? 'Done',
                        res['success'] == true ? Colors.green : Colors.red);
                    _load();
                  })),
            ]),
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VENDORS — with verified indicator
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildVendors() {
    if (vendors.isEmpty) return const Center(child: Text('No vendors found'));
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: vendors.length,
      itemBuilder: (ctx, i) {
        final v        = vendors[i];
        final id       = v['id'] as int? ?? 0;
        final name     = v['name'] as String? ?? '';
        final email    = v['email'] as String? ?? '';
        final active   = v['active'] as bool? ?? true;
        final code     = v['vendorCode'] as String? ?? '';
        final verified = v['verified'] as bool? ?? false;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: active ? Colors.indigo.shade100 : Colors.grey.shade200,
              child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'V',
                  style: TextStyle(
                      color: active ? Colors.indigo.shade800 : Colors.grey,
                      fontWeight: FontWeight.bold)),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(email, style: const TextStyle(fontSize: 12)),
              if (code.isNotEmpty)
                Text(code, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              Row(children: [
                Icon(verified ? Icons.verified_outlined : Icons.cancel_outlined,
                    size: 12, color: verified ? Colors.green : Colors.red),
                const SizedBox(width: 3),
                Text(verified ? 'Verified' : 'Unverified',
                    style: TextStyle(fontSize: 10,
                        color: verified ? Colors.green : Colors.red)),
              ]),
            ]),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: active ? Colors.green.shade100 : Colors.red.shade100,
                    borderRadius: BorderRadius.circular(12)),
                child: Text(active ? 'Active' : 'Suspended',
                    style: TextStyle(
                        color: active ? Colors.green : Colors.red,
                        fontSize: 10, fontWeight: FontWeight.bold))),
              IconButton(
                icon: Icon(active ? Icons.block : Icons.check_circle_outline,
                    color: active ? Colors.red : Colors.green, size: 20),
                onPressed: () async {
                  final res = await AdminService.toggleVendor(id);
                  _snack(res['message'] ?? 'Done',
                      res['success'] == true ? Colors.green : Colors.red);
                  _load();
                }),
            ]),
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ORDERS — filter pills + search + detail sheet + cancel
  // ─────────────────────────────────────────────────────────────────────────
  Widget _buildOrders() {
    final counts = <String, int>{};
    for (final o in orders) {
      final s = o['trackingStatus'] as String? ?? '';
      counts[s] = (counts[s] ?? 0) + 1;
    }

    final filtered = orders.where((o) {
      if (_orderStatusFilter.isNotEmpty &&
          o['trackingStatus'] != _orderStatusFilter) { return false; }
      if (_orderSearch.isNotEmpty) {
        final q = _orderSearch.toLowerCase();
        return o['id'].toString().contains(q)
            || (o['customerName'] ?? '').toString().toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Column(children: [
      Container(
        color: Colors.grey.shade50,
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
        child: Column(children: [
          TextField(
            onChanged: (v) => setState(() => _orderSearch = v),
            decoration: InputDecoration(
              hintText: 'Search by order ID or customer…',
              prefixIcon: const Icon(Icons.search, size: 18),
              suffixIcon: _orderSearch.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16),
                      onPressed: () => setState(() => _orderSearch = ''))
                  : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              isDense: true,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              _pill('All (${orders.length})', '', _orderStatusFilter,
                  (v) => setState(() => _orderStatusFilter = v)),
              ...counts.entries.where((e) => e.value > 0).map((e) => Padding(
                padding: const EdgeInsets.only(left: 6),
                child: _pill('${e.key.replaceAll('_', ' ')} (${e.value})',
                    e.key, _orderStatusFilter,
                    (v) => setState(() => _orderStatusFilter = v)),
              )),
            ]),
          ),
        ]),
      ),
      Expanded(
        child: filtered.isEmpty
            ? const Center(child: Text('No orders', style: TextStyle(color: Colors.grey)))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: filtered.length,
                itemBuilder: (ctx, i) => _orderCard(filtered[i]),
              ),
      ),
    ]);
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final id     = o['id'] as int? ?? 0;
    final total  = (o['totalPrice'] as num? ?? o['amount'] as num? ?? 0).toDouble();
    final status = o['trackingStatus'] as String? ?? 'PLACED';
    final name   = o['customerName'] as String? ?? 'Customer';
    final date   = o['orderDate'] as String?;
    final items  = List.from(o['items'] ?? []);
    final isCod  = (o['paymentMode'] as String? ?? '').toUpperCase() == 'COD';
    final statusColor = _statusColors[status] ?? Colors.grey;

    String dateStr = '';
    if (date != null) {
      try {
        final dt = DateTime.parse(date);
        dateStr = '${dt.day}/${dt.month}/${dt.year}';
      } catch (_) {}
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _openOrderDetail(o),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('#$id',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10)),
                child: Text(status.replaceAll('_', ' '),
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.bold, color: statusColor))),
              if (isCod) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                      color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                  child: const Text('💵 COD',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.red))),
              ],
              const Spacer(),
              Text('₹${total.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ]),
            const SizedBox(height: 6),
            Row(children: [
              const Icon(Icons.person_outline, size: 13, color: Colors.grey),
              const SizedBox(width: 4),
              Text(name, style: const TextStyle(fontSize: 12)),
              if (dateStr.isNotEmpty) ...[
                const Spacer(),
                Text(dateStr,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ],
            ]),
            if (items.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('${items.length} item${items.length != 1 ? 's' : ''}',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ],
            const SizedBox(height: 10),
            InputDecorator(
              decoration: InputDecoration(
                labelText: 'Update Status',
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              ),
              child: DropdownButton<String>(
                value: _statuses.contains(status) ? status : _statuses.first,
                isExpanded: true,
                underline: const SizedBox.shrink(),
                isDense: true,
                style: const TextStyle(fontSize: 12, color: Colors.black87),
                items: _statuses
                    .map((s) => DropdownMenuItem(
                        value: s,
                        child: Text(s.replaceAll('_', ' '),
                            style: const TextStyle(fontSize: 12))))
                    .toList(),
                onChanged: (newStatus) {
                  if (newStatus != null) { _updateOrderStatus(id, newStatus); }
                },
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // Shared pill button
  Widget _pill(String label, String value, String selected, void Function(String) onTap) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
            color: isSelected ? Colors.red.shade700 : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : Colors.black54)),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Detail Bottom Sheet — full image gallery + info + approve/reject
// ─────────────────────────────────────────────────────────────────────────────
class _ProductDetailSheet extends StatefulWidget {
  final Map<String, dynamic> product;
  final List<String> images;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _ProductDetailSheet({
    required this.product,
    required this.images,
    required this.onApprove,
    required this.onReject,
  });

  @override
  State<_ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<_ProductDetailSheet> {
  int _imgIndex = 0;

  @override
  Widget build(BuildContext context) {
    final p         = widget.product;
    final isPending = p['approved'] == false;
    final price     = (p['price'] as num? ?? 0).toDouble();
    final mrp       = (p['mrp'] as num? ?? 0).toDouble();
    final hasDisc   = mrp > 0 && mrp > price;
    final discPct   = hasDisc ? ((1 - price / mrp) * 100).round() : 0;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          // Handle
          Container(margin: const EdgeInsets.only(top: 10), width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 10, 10),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p['name'] as String? ?? '',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
                Text('Product #${p['id']} · ${p['category'] ?? ''}',
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ])),
              if (isPending)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green, foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Approve', style: TextStyle(fontSize: 12)),
                  onPressed: widget.onApprove)
              else
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red, foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Hide', style: TextStyle(fontSize: 12)),
                  onPressed: widget.onReject),
              const SizedBox(width: 4),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
            ]),
          ),
          const Divider(height: 1),
          // Body
          Expanded(
            child: ListView(
              controller: scrollCtrl,
              padding: const EdgeInsets.all(18),
              children: [
                // Gallery
                if (widget.images.isNotEmpty) ...[
                  AspectRatio(
                    aspectRatio: 1,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(widget.images[_imgIndex], fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Container(
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey))),
                    ),
                  ),
                  if (widget.images.length > 1) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 56,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: widget.images.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (ctx, i) => GestureDetector(
                          onTap: () => setState(() => _imgIndex = i),
                          child: Container(
                            width: 56, height: 56,
                            decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: i == _imgIndex ? Colors.black : Colors.grey.shade300,
                                    width: i == _imgIndex ? 2 : 1)),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(7),
                              child: Image.network(widget.images[i], fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.image, color: Colors.grey)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                ],
                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                      color: isPending ? Colors.orange.shade100 : Colors.green.shade100,
                      borderRadius: BorderRadius.circular(20)),
                  child: Text(isPending ? '⏳ Pending Approval' : '✓ Approved',
                      style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.bold,
                          color: isPending ? Colors.deepOrange : Colors.green)),
                ),
                const SizedBox(height: 14),
                // Price
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('₹${price.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1)),
                  if (hasDisc) ...[
                    const SizedBox(width: 10),
                    Text('₹${mrp.toStringAsFixed(0)}',
                        style: const TextStyle(decoration: TextDecoration.lineThrough,
                            color: Colors.grey, fontSize: 14)),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.green.shade100,
                          borderRadius: BorderRadius.circular(6)),
                      child: Text('$discPct% off',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green))),
                  ],
                ]),
                if ((p['gstRate'] as num? ?? 0) > 0)
                  Text('+ ${p['gstRate']}% GST applicable',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                const SizedBox(height: 16),
                // Info grid
                GridView.count(
                  crossAxisCount: 2, shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.5,
                  children: [
                    _infoTile('Vendor',  p['vendorName']?.toString() ?? '—'),
                    _infoTile('Category', p['category']?.toString() ?? '—'),
                    _infoTile('Stock', '${p['stock'] ?? '—'} units'),
                    _infoTile('Alert Threshold',
                        p['stockAlertThreshold'] != null ? '${p['stockAlertThreshold']} units' : '—'),
                  ],
                ),
                // Description
                if (p['description'] != null && (p['description'] as String).isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10)),
                    child: Text(p['description'].toString(),
                        style: const TextStyle(fontSize: 13, height: 1.6)),
                  ),
                ],
                // PIN restriction
                if (p['allowedPinCodes'] != null && (p['allowedPinCodes'] as String).isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('Restricted Pin Codes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(8)),
                    child: Text(p['allowedPinCodes'].toString(),
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                  ),
                ],
                const SizedBox(height: 16),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  Widget _infoTile(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
            letterSpacing: 0.4, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            maxLines: 1, overflow: TextOverflow.ellipsis),
      ]),
    );
  }
}