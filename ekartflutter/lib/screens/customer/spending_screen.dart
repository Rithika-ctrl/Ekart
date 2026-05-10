import 'package:flutter/material.dart';
import '../../services/services.dart';

class SpendingScreen extends StatefulWidget {
  const SpendingScreen({super.key});
  @override
  State<SpendingScreen> createState() => _SpendingScreenState();
}

class _SpendingScreenState extends State<SpendingScreen> {
  Map<String, dynamic>? data;
  bool loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    final res = await SpendingService.getSummary();
    if (!mounted) return;
    setState(() {
      data    = res['success'] == true ? res : null;
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Spending'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : (data == null || data!['hasData'] != true)
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.analytics_outlined, size: 80, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text('No spending data yet',
                          style: TextStyle(fontSize: 18, color: Colors.grey[500])),
                      const SizedBox(height: 8),
                      Text('Your spending analytics will appear here after your first delivered order.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[400])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Summary cards row
                      Row(children: [
                        Expanded(child: _summaryCard('Total Spent',
                            '₹${(data!['totalSpent'] as num).toStringAsFixed(2)}',
                            Icons.currency_rupee, Colors.blue)),
                        const SizedBox(width: 12),
                        Expanded(child: _summaryCard('Orders',
                            '${data!['totalOrders']}',
                            Icons.receipt_long, Colors.green)),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(child: _summaryCard('Avg. Order',
                            '₹${(data!['averageOrderValue'] as num).toStringAsFixed(2)}',
                            Icons.bar_chart, Colors.orange)),
                        const SizedBox(width: 12),
                        Expanded(child: _summaryCard('Top Category',
                            '${data!['topCategory']}',
                            Icons.category, Colors.purple)),
                      ]),

                      const SizedBox(height: 24),

                      // Category breakdown
                      const Text('Spending by Category',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      ..._buildCategoryBars(),

                      const SizedBox(height: 24),

                      // Monthly breakdown
                      if ((data!['monthlySpending'] as Map?)?.isNotEmpty == true) ...[
                        const Text('Monthly Spending',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        ..._buildMonthlyRows(),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _summaryCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(value,
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        Text(label,
            style: TextStyle(color: Colors.grey[600], fontSize: 12)),
      ]),
    );
  }

  List<Widget> _buildCategoryBars() {
    final catSpend = Map<String, dynamic>.from(data!['categorySpending'] ?? {});
    if (catSpend.isEmpty) return [Text('No data', style: TextStyle(color: Colors.grey[500]))];
    final maxVal = catSpend.values
        .map((v) => (v as num).toDouble())
        .reduce((a, b) => a > b ? a : b);
    return catSpend.entries.map((e) {
      final pct = maxVal > 0 ? (e.value as num).toDouble() / maxVal : 0.0;
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(e.key, style: const TextStyle(fontWeight: FontWeight.w500)),
            Text('₹${(e.value as num).toStringAsFixed(2)}',
                style: TextStyle(color: Colors.blue.shade700, fontWeight: FontWeight.bold)),
          ]),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: Colors.grey[200],
              color: Colors.blue.shade700,
              minHeight: 8,
            ),
          ),
        ]),
      );
    }).toList();
  }

  List<Widget> _buildMonthlyRows() {
    final monthly = Map<String, dynamic>.from(data!['monthlySpending'] ?? {});
    final sorted  = monthly.entries.toList()
      ..sort((a, b) => b.key.compareTo(a.key));
    return sorted.take(6).map((e) {
      return ListTile(
        dense: true,
        leading: const Icon(Icons.calendar_month, color: Colors.blue),
        title: Text(e.key),
        trailing: Text('₹${(e.value as num).toStringAsFixed(2)}',
            style: TextStyle(
                fontWeight: FontWeight.bold, color: Colors.blue.shade700)),
      );
    }).toList();
  }
}
