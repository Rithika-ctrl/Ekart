import 'package:flutter/material.dart';
import '../../services/vendor_service.dart';

class VendorSalesReportScreen extends StatefulWidget {
  const VendorSalesReportScreen({super.key});

  @override
  State<VendorSalesReportScreen> createState() => _VendorSalesReportScreenState();
}

class _VendorSalesReportScreenState extends State<VendorSalesReportScreen> {
  Map<String, dynamic>? data;
  bool loading = true;
  String? error;

  // ── Period selector (matches website: daily / weekly / monthly) ────────────
  String _period = 'weekly';
  static const _periods = ['daily', 'weekly', 'monthly'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load([String? period]) async {
    if (period != null) _period = period;
    setState(() { loading = true; error = null; });
    final res = await VendorService.getSalesReport(period: _period);
    if (!mounted) return;
    if (res['success'] == true) {
      setState(() { data = res; loading = false; });
    } else {
      setState(() { error = res['message']; loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Report 📊',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => _load()),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 60, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(error!, style: TextStyle(color: Colors.grey[600])),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: () => _load(), child: const Text('Retry')),
                  ],
                ))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Period selector ──────────────────────────────
                        _buildPeriodSelector(),
                        const SizedBox(height: 20),
                        _buildSummary(),
                        const SizedBox(height: 24),
                        // ── Revenue trend chart ──────────────────────────
                        _buildRevenueChart(),
                        const SizedBox(height: 24),
                        _buildTopProducts(),
                        const SizedBox(height: 24),
                        _buildRecentOrders(),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
    );
  }

  // ── Period selector ────────────────────────────────────────────────────────

  Widget _buildPeriodSelector() {
    return Row(
      children: _periods.map((p) {
        final selected = _period == p;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: InkWell(
            onTap: loading ? null : () => _load(p),
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: selected ? Colors.green.shade600 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: selected
                        ? Colors.green.shade600
                        : Colors.grey.shade300),
              ),
              child: Text(
                '${p[0].toUpperCase()}${p.substring(1)}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight:
                      selected ? FontWeight.bold : FontWeight.normal,
                  color: selected ? Colors.white : Colors.grey.shade700,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ── Summary cards ──────────────────────────────────────────────────────────

  Widget _buildSummary() {
    final totalRevenue   = (data?['totalRevenue']   ?? 0).toDouble();
    final totalOrders    = data?['totalOrders']    ?? 0;
    final avgOrderValue  = (data?['avgOrderValue'] ?? 0).toDouble();
    final topProduct     = data?['topProduct']     as String? ?? '—';
    final totalProducts  = data?['totalProducts']  ?? 0;
    final pendingOrders  = data?['pendingOrders']  ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Revenue Summary',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _statCard('Total Revenue',
              '₹${totalRevenue.toStringAsFixed(0)}',
              Icons.currency_rupee, Colors.green)),
          const SizedBox(width: 12),
          Expanded(child: _statCard('Total Orders',
              '$totalOrders', Icons.shopping_bag, Colors.blue)),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _statCard('Avg Order Value',
              '₹${avgOrderValue.toStringAsFixed(0)}',
              Icons.show_chart, Colors.orange)),
          const SizedBox(width: 12),
          Expanded(child: _statCard('Pending Orders',
              '$pendingOrders', Icons.hourglass_top, Colors.purple)),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _statCard('Products Listed',
              '$totalProducts', Icons.inventory, Colors.teal)),
          const SizedBox(width: 12),
          Expanded(child: _statCard('Top Product',
              topProduct, Icons.emoji_events, Colors.amber,
              smallValue: true)),
        ]),
      ],
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color,
      {bool smallValue = false}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  fontSize: smallValue ? 13 : 18,
                  fontWeight: FontWeight.bold,
                  color: color),
              maxLines: 2,
              overflow: TextOverflow.ellipsis),
          Text(label,
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  // ── Revenue trend bar chart ────────────────────────────────────────────────

  Widget _buildRevenueChart() {
    final chartData = data?['data'] as List<dynamic>? ?? [];
    if (chartData.isEmpty) return const SizedBox.shrink();

    final revenues = chartData
        .map((d) => ((d as Map<String, dynamic>)['revenue'] ?? 0).toDouble())
        .toList();
    final maxRevenue = revenues.reduce((a, b) => a > b ? a : b);
    if (maxRevenue <= 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.grey.withValues(alpha: 0.08), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Revenue Trend — ${_period[0].toUpperCase()}${_period.substring(1)}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          SizedBox(
            height: 160,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: chartData.asMap().entries.map((entry) {
                final d      = entry.value as Map<String, dynamic>;
                final rev    = (d['revenue'] ?? 0).toDouble();
                final label  = (d['label'] ?? d['date'] ?? '${entry.key + 1}').toString();
                final barH   = (rev / maxRevenue * 110).clamp(4.0, 110.0);
                final isMax  = rev == maxRevenue && rev > 0;

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        // Value label on top of bar
                        if (rev > 0)
                          Text(
                            rev >= 1000
                                ? '₹${(rev / 1000).toStringAsFixed(1)}k'
                                : '₹${rev.toStringAsFixed(0)}',
                            style: TextStyle(
                                fontSize: 8,
                                color: isMax
                                    ? Colors.green.shade800
                                    : Colors.grey.shade500,
                                fontWeight: isMax
                                    ? FontWeight.bold
                                    : FontWeight.normal),
                            textAlign: TextAlign.center,
                          ),
                        const SizedBox(height: 2),
                        // Bar
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          height: barH,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: isMax
                                  ? [Colors.green.shade400, Colors.green.shade700]
                                  : [Colors.indigo.shade300, Colors.indigo.shade600],
                            ),
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4)),
                          ),
                        ),
                        const SizedBox(height: 4),
                        // X-axis label
                        Text(
                          label,
                          style: TextStyle(
                              fontSize: 8,
                              color: Colors.grey.shade600),
                          textAlign: TextAlign.center,
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // ── Top products ───────────────────────────────────────────────────────────

  Widget _buildTopProducts() {
    final topProducts = data?['topProducts'] as List<dynamic>? ?? [];
    if (topProducts.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Top Selling Products',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
            boxShadow: [
              BoxShadow(color: Colors.grey.withValues(alpha: 0.08), blurRadius: 8),
            ],
          ),
          child: Column(
            children: topProducts.asMap().entries.map((entry) {
              final i = entry.key;
              final p = entry.value as Map<String, dynamic>;
              final revenue   = (p['revenue']   ?? 0).toDouble();
              final unitsSold = p['unitsSold']  ?? 0;
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.indigo.shade50,
                  child: Text('${i + 1}',
                      style: TextStyle(
                          color: Colors.indigo.shade700,
                          fontWeight: FontWeight.bold)),
                ),
                title: Text(p['name'] ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                subtitle: Text('$unitsSold units sold'),
                trailing: Text('₹${revenue.toStringAsFixed(0)}',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.green.shade700,
                        fontSize: 14)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // ── Recent orders ──────────────────────────────────────────────────────────

  Widget _buildRecentOrders() {
    final orders = data?['recentOrders'] as List<dynamic>? ?? [];
    if (orders.isEmpty) return const SizedBox.shrink();

    final statusColors = {
      'PROCESSING':      Colors.orange,
      'PACKED':          Colors.indigo,
      'SHIPPED':         Colors.blue,
      'OUT_FOR_DELIVERY':Colors.purple,
      'DELIVERED':       Colors.green,
      'CANCELLED':       Colors.red,
      'REFUNDED':        Colors.teal,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent Orders',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
            boxShadow: [
              BoxShadow(color: Colors.grey.withValues(alpha: 0.08), blurRadius: 8),
            ],
          ),
          child: Column(
            children: orders.map((order) {
              final o           = order as Map<String, dynamic>;
              final status      = o['trackingStatus'] as String? ?? 'PROCESSING';
              final color       = statusColors[status] ?? Colors.grey;
              final vendorTotal = (o['vendorTotal'] ?? o['totalPrice'] ?? 0).toDouble();
              final paymentMode = o['paymentMode'] as String?;
              final orderDate   = o['orderDate']   as String?;

              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: color.withValues(alpha: 0.12),
                  child: Icon(Icons.receipt_long, color: color, size: 18),
                ),
                title: Row(children: [
                  Text('Order #${o['id']}',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (paymentMode != null && paymentMode.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    // ── Payment mode badge (new feature) ──────────────────
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Text(
                        paymentMode,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber.shade800),
                      ),
                    ),
                  ],
                ]),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(status.replaceAll('_', ' '),
                        style: TextStyle(color: color, fontSize: 12,
                            fontWeight: FontWeight.w500)),
                    if (orderDate != null)
                      Text(
                        _formatDate(orderDate),
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                  ],
                ),
                trailing: Text('₹${vendorTotal.toStringAsFixed(0)}',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.indigo.shade700)),
                isThreeLine: orderDate != null,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  String _formatDate(String raw) {
    try {
      final dt = DateTime.parse(raw).toLocal();
      final months = [
        '', 'Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec',
      ];
      return '${dt.day} ${months[dt.month]}, '
          '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
    } catch (_) {
      return raw;
    }
  }
}