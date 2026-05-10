import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../config/api_config.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AdminPoliciesScreen extends StatefulWidget {
  const AdminPoliciesScreen({super.key});
  @override
  State<AdminPoliciesScreen> createState() => _AdminPoliciesScreenState();
}

class _AdminPoliciesScreenState extends State<AdminPoliciesScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _policies = [];
  String? _editingSlug; // null = creating new

  final _titleCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  String _category = 'terms';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _slugCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<String?> _token() async => AuthService.currentUser?.token;

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final t = await _token();
      final res = await http.get(
          Uri.parse('${ApiConfig.base}/admin/policies'),
          headers: {'Authorization': 'Bearer $t'});
      final data = json.decode(res.body);
      if (data['success'] == true) {
        final raw = data['policies'] ?? data['data'] ?? [];
        setState(() {
          _policies = List<Map<String, dynamic>>.from(raw);
        });
      }
    } catch (e) {
      _snack('Failed: $e', Colors.red);
    }
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (_titleCtrl.text.trim().isEmpty || _slugCtrl.text.trim().isEmpty) {
      _snack('Title and slug required', Colors.orange);
      return;
    }
    final body = {
      'title': _titleCtrl.text.trim(),
      'slug': _slugCtrl.text.trim(),
      'category': _category,
      'content': _contentCtrl.text.trim(),
    };
    try {
      final t = await _token();
      final http.Response res;
      if (_editingSlug != null) {
        res = await http.put(
            Uri.parse('${ApiConfig.base}/admin/policies/$_editingSlug'),
            headers: {'Authorization': 'Bearer $t', 'Content-Type': 'application/json'},
            body: json.encode(body));
      } else {
        res = await http.post(
            Uri.parse('${ApiConfig.base}/admin/policies'),
            headers: {'Authorization': 'Bearer $t', 'Content-Type': 'application/json'},
            body: json.encode(body));
      }
      final data = json.decode(res.body);
      if (data['success'] == true) {
        _snack(_editingSlug != null ? 'Policy updated ✓' : 'Policy created ✓', Colors.green);
        _clearForm();
        _load();
      } else {
        _snack(data['message'] ?? 'Failed', Colors.red);
      }
    } catch (e) {
      _snack('Error: $e', Colors.red);
    }
  }

  Future<void> _delete(String slug) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Policy'),
        content: Text('Delete policy "$slug"? Cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final t = await _token();
      final res = await http.delete(
          Uri.parse('${ApiConfig.base}/admin/policies/$slug'),
          headers: {'Authorization': 'Bearer $t'});
      final data = json.decode(res.body);
      _snack(data['message'] ?? (data['success'] == true ? 'Deleted' : 'Failed'),
          data['success'] == true ? Colors.green : Colors.red);
      if (data['success'] == true) _load();
    } catch (e) {
      _snack('Error: $e', Colors.red);
    }
  }

  void _startEdit(Map<String, dynamic> p) {
    setState(() {
      _editingSlug = p['slug'] as String? ?? '';
      _titleCtrl.text = p['title'] as String? ?? '';
      _slugCtrl.text = p['slug'] as String? ?? '';
      _category = p['category'] as String? ?? 'terms';
      _contentCtrl.text = p['content'] as String? ?? '';
    });
  }

  void _clearForm() {
    setState(() {
      _editingSlug = null;
      _titleCtrl.clear();
      _slugCtrl.clear();
      _contentCtrl.clear();
      _category = 'terms';
    });
  }

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));
  }

  Color _categoryColor(String cat) {
    switch (cat) {
      case 'privacy': return Colors.blue;
      case 'refund': return Colors.green;
      default: return Colors.purple;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Policy Management'),
        backgroundColor: Colors.purple.shade700,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Policy list
                Expanded(
                  flex: 2,
                  child: _policies.isEmpty
                      ? const Center(child: Text('No policies found'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _policies.length,
                          itemBuilder: (ctx, i) {
                            final p = _policies[i];
                            final cat = p['category'] as String? ?? 'terms';
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                              child: ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                      color: _categoryColor(cat)
                                          .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(6)),
                                  child: Text(cat,
                                      style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: _categoryColor(cat))),
                                ),
                                title: Text(p['title'] as String? ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text(p['slug'] as String? ?? '',
                                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                  IconButton(
                                      icon: const Icon(Icons.edit_outlined, size: 18),
                                      onPressed: () => _startEdit(p)),
                                  IconButton(
                                      icon: const Icon(Icons.delete_outline,
                                          size: 18, color: Colors.red),
                                      onPressed: () =>
                                          _delete(p['slug'] as String? ?? '')),
                                ]),
                              ),
                            );
                          },
                        ),
                ),

                // Edit / create panel
                Container(
                  width: 340,
                  decoration: BoxDecoration(
                      border: Border(left: BorderSide(color: Colors.grey.shade200)),
                      color: Colors.grey.shade50),
                  padding: const EdgeInsets.all(16),
                  child: SingleChildScrollView(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Text(
                          _editingSlug != null ? 'Edit Policy' : 'Create Policy',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const Spacer(),
                        if (_editingSlug != null)
                          TextButton(onPressed: _clearForm, child: const Text('+ New')),
                      ]),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _titleCtrl,
                        decoration: const InputDecoration(
                            labelText: 'Title *', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _slugCtrl,
                        decoration: const InputDecoration(
                            labelText: 'Slug *', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 10),
                      InputDecorator(
                        decoration: const InputDecoration(
                            labelText: 'Category', border: OutlineInputBorder()),
                        child: DropdownButton<String>(
                          value: _category,
                          isExpanded: true,
                          underline: const SizedBox.shrink(),
                          items: const [
                            DropdownMenuItem(value: 'terms', child: Text('Terms')),
                            DropdownMenuItem(value: 'privacy', child: Text('Privacy')),
                            DropdownMenuItem(value: 'refund', child: Text('Refund')),
                          ],
                          onChanged: (v) => setState(() => _category = v ?? 'terms'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _contentCtrl,
                        minLines: 8,
                        maxLines: 15,
                        decoration: const InputDecoration(
                            labelText: 'Content', border: OutlineInputBorder(),
                            alignLabelWithHint: true),
                      ),
                      const SizedBox(height: 14),
                      Row(children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _clearForm,
                            child: const Text('Clear'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple.shade700,
                                foregroundColor: Colors.white),
                            onPressed: _save,
                            child: Text(_editingSlug != null ? 'Save' : 'Create'),
                          ),
                        ),
                      ]),
                    ]),
                  ),
                ),
              ],
            ),
    );
  }
}