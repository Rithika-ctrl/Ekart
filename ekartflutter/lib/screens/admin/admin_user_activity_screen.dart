import 'package:flutter/material.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../../config/api_config.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AdminUserActivityScreen extends StatefulWidget {
  const AdminUserActivityScreen({super.key});
  @override
  State<AdminUserActivityScreen> createState() => _AdminUserActivityScreenState();
}

class _AdminUserActivityScreenState extends State<AdminUserActivityScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _customers = [];
  // ignore: prefer_final_fields
  Map<int, List<Map<String, dynamic>>> _activityCache = {};
  int? _selectedUserId;
  bool _activityLoading = false;
  String _activityFilter = 'all';
  final _searchCtrl = TextEditingController();

  final Map<String, Color> _actionColors = {
    'LOGIN': Colors.blue,
    'LOGOUT': Colors.grey,
    'VIEW_PRODUCT': Colors.purple,
    'ADD_TO_CART': Colors.amber,
    'REMOVE_FROM_CART': Colors.red,
    'CHECKOUT': Colors.green,
    'PURCHASE': Colors.teal,
    'REVIEW': Colors.orange,
    'SEARCH': Colors.indigo,
    'FILTER': Colors.cyan,
  };

  final Map<String, IconData> _actionIcons = {
    'LOGIN': Icons.login,
    'LOGOUT': Icons.logout,
    'VIEW_PRODUCT': Icons.visibility_outlined,
    'ADD_TO_CART': Icons.add_shopping_cart,
    'REMOVE_FROM_CART': Icons.remove_shopping_cart,
    'CHECKOUT': Icons.payment,
    'PURCHASE': Icons.check_circle_outline,
    'REVIEW': Icons.star_outline,
    'SEARCH': Icons.search,
    'FILTER': Icons.filter_list,
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await AdminService.getUsers();
      if (res['success'] == true) {
        setState(() {
          _customers = List<Map<String, dynamic>>.from(res['customers'] ?? []);
        });
      }
    } catch (e) {
      _snack('Failed to load: $e', Colors.red);
    }
    setState(() => _loading = false);
  }

  Future<void> _loadActivity(int userId) async {
    if (_selectedUserId == userId) {
      setState(() => _selectedUserId = null);
      return;
    }
    setState(() {
      _selectedUserId = userId;
      _activityFilter = 'all';
    });
    if (_activityCache.containsKey(userId)) return;

    setState(() => _activityLoading = true);
    try {
      final token = AuthService.currentUser?.token;
      final url = '${ApiConfig.webBase}/api/user-activity/user/$userId';
      final res = await http.get(Uri.parse(url),
          headers: {'Authorization': 'Bearer $token'});
      final data = json.decode(res.body);
      final acts = data is List ? data : (data['activities'] ?? []);
      setState(() {
        _activityCache[userId] = List<Map<String, dynamic>>.from(acts);
      });
    } catch (_) {
      setState(() => _activityCache[userId] = []);
    }
    setState(() => _activityLoading = false);
  }

  List<String> get _allActionTypes {
    if (_selectedUserId == null) return [];
    final acts = _activityCache[_selectedUserId!] ?? [];
    final types = <String>{};
    for (final a in acts) {
      if (a['actionType'] != null) types.add(a['actionType'].toString());
    }
    return types.toList()..sort();
  }

  List<Map<String, dynamic>> get _filteredActivities {
    if (_selectedUserId == null) return [];
    final acts = _activityCache[_selectedUserId!] ?? [];
    if (_activityFilter == 'all') return acts;
    return acts.where((a) => a['actionType'] == _activityFilter).toList();
  }

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));
  }

  List<Map<String, dynamic>> get _filteredCustomers {
    final q = _searchCtrl.text.toLowerCase().trim();
    if (q.isEmpty) return _customers;
    return _customers.where((c) {
      return (c['name'] ?? '').toString().toLowerCase().contains(q) ||
          (c['email'] ?? '').toString().toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('User Activity'),
        backgroundColor: Colors.deepPurple.shade700,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Row(
              children: [
                // User list panel
                Container(
                  width: 260,
                  decoration: BoxDecoration(
                      border: Border(right: BorderSide(color: Colors.grey.shade200))),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: TextField(
                          controller: _searchCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'Search customers…',
                            prefixIcon: const Icon(Icons.search, size: 18),
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            isDense: true,
                          ),
                        ),
                      ),
                      Expanded(
                        child: ListView.builder(
                          itemCount: _filteredCustomers.length,
                          itemBuilder: (ctx, i) {
                            final c = _filteredCustomers[i];
                            final cId = c['id'] as int? ?? 0;
                            final selected = _selectedUserId == cId;
                            return InkWell(
                              onTap: () => _loadActivity(cId),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                    color: selected
                                        ? Colors.deepPurple.shade50
                                        : Colors.transparent,
                                    border: Border(
                                        left: BorderSide(
                                            color: selected
                                                ? Colors.deepPurple
                                                : Colors.transparent,
                                            width: 3))),
                                child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        c['name'] as String? ?? '',
                                        style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13,
                                            color: selected
                                                ? Colors.deepPurple
                                                : Colors.black87),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        c['email'] as String? ?? '',
                                        style: const TextStyle(
                                            fontSize: 11, color: Colors.grey),
                                      ),
                                    ]),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),

                // Activity feed panel
                Expanded(
                  child: _selectedUserId == null
                      ? Center(
                          child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.person_search_outlined,
                                    size: 64, color: Colors.grey[300]),
                                const SizedBox(height: 12),
                                Text('Select a customer to view activity',
                                    style: TextStyle(color: Colors.grey[500])),
                              ]))
                      : _activityLoading && !_activityCache.containsKey(_selectedUserId)
                          ? const Center(child: CircularProgressIndicator())
                          : Column(
                              children: [
                                // Filter bar
                                Container(
                                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                                  decoration: BoxDecoration(
                                      border: Border(
                                          bottom: BorderSide(color: Colors.grey.shade200))),
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(
                                      _customers
                                              .firstWhere(
                                                (c) => c['id'] == _selectedUserId,
                                                orElse: () => {'name': 'User'},
                                              )['name'] ??
                                          'Activity',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                    const SizedBox(height: 8),
                                    SingleChildScrollView(
                                      scrollDirection: Axis.horizontal,
                                      child: Row(
                                        children: [
                                          _filterChip('all', 'All'),
                                          ..._allActionTypes
                                              .map((t) => _filterChip(t, t)),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Total: ${_activityCache[_selectedUserId]?.length ?? 0} | Showing: ${_filteredActivities.length}',
                                      style: TextStyle(
                                          fontSize: 11, color: Colors.grey[600]),
                                    ),
                                  ]),
                                ),

                                // Activity list
                                Expanded(
                                  child: _filteredActivities.isEmpty
                                      ? Center(
                                          child: Text('No activities',
                                              style: TextStyle(color: Colors.grey[500])))
                                      : ListView.builder(
                                          padding: const EdgeInsets.all(12),
                                          itemCount: _filteredActivities.length,
                                          itemBuilder: (ctx, i) {
                                            final a = _filteredActivities[i];
                                            final aType = a['actionType'] as String? ?? 'ACTION';
                                            final color =
                                                _actionColors[aType] ?? Colors.grey;
                                            final icon =
                                                _actionIcons[aType] ?? Icons.circle_outlined;
                                            String meta = '';
                                            try {
                                              final m = a['metadata'] is String
                                                  ? json.decode(a['metadata'])
                                                  : a['metadata'];
                                              if (m is Map) {
                                                meta = m['productName']?.toString() ??
                                                    m['category']?.toString() ??
                                                    '';
                                              }
                                            } catch (_) {
                                              meta = a['metadata']?.toString() ?? '';
                                            }
                                            final ts = a['timestamp'] as String?;
                                            String timeStr = '';
                                            if (ts != null) {
                                              try {
                                                final dt = DateTime.parse(ts).toLocal();
                                                timeStr =
                                                    '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
                                              } catch (_) {}
                                            }

                                            return Container(
                                              margin: const EdgeInsets.only(bottom: 8),
                                              padding: const EdgeInsets.all(12),
                                              decoration: BoxDecoration(
                                                  color: Colors.white,
                                                  borderRadius: BorderRadius.circular(8),
                                                  border: Border(
                                                      left: BorderSide(color: color, width: 3)),
                                                  boxShadow: [
                                                    BoxShadow(
                                                        color: Colors.black.withValues(alpha: 0.04),
                                                        blurRadius: 4,
                                                        offset: const Offset(0, 2))
                                                  ]),
                                              child: Row(children: [
                                                Container(
                                                  padding: const EdgeInsets.all(6),
                                                  decoration: BoxDecoration(
                                                      color: color.withValues(alpha: 0.1),
                                                      borderRadius: BorderRadius.circular(8)),
                                                  child:
                                                      Icon(icon, size: 16, color: color),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment.start,
                                                      children: [
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(
                                                              horizontal: 8, vertical: 2),
                                                          decoration: BoxDecoration(
                                                              color: color.withValues(alpha: 0.12),
                                                              borderRadius:
                                                                  BorderRadius.circular(4)),
                                                          child: Text(
                                                            aType,
                                                            style: TextStyle(
                                                                fontSize: 11,
                                                                fontWeight: FontWeight.bold,
                                                                color: color),
                                                          ),
                                                        ),
                                                        if (meta.isNotEmpty)
                                                          Padding(
                                                            padding:
                                                                const EdgeInsets.only(top: 4),
                                                            child: Text(
                                                              meta,
                                                              style: const TextStyle(
                                                                  fontSize: 12,
                                                                  color: Colors.black54),
                                                            ),
                                                          ),
                                                      ]),
                                                ),
                                                Text(timeStr,
                                                    style: const TextStyle(
                                                        fontSize: 10, color: Colors.grey)),
                                              ]),
                                            );
                                          },
                                        ),
                                ),
                              ],
                            ),
                ),
              ],
            ),
    );
  }

  Widget _filterChip(String value, String label) {
    final selected = _activityFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _activityFilter = value),
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
            color: selected ? Colors.deepPurple : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Colors.black54)),
      ),
    );
  }
}