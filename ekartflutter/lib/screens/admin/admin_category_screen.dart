import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../config/api_config.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AdminCategoryScreen extends StatefulWidget {
  const AdminCategoryScreen({super.key});
  @override
  State<AdminCategoryScreen> createState() => _AdminCategoryScreenState();
}

class _AdminCategoryScreenState extends State<AdminCategoryScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _categories = [];
  int? _expandedId;

  // Add parent form
  final _parentNameCtrl = TextEditingController();
  String _parentEmoji = '📦';
  int _parentOrder = 0;
  bool _showParentForm = false;

  // Add sub form
  final _subNameCtrl = TextEditingController();
  String _subEmoji = '';
  // ignore: prefer_final_fields
  int _subOrder = 0;
  int? _subParentId;
  bool _showSubForm = false;

  final List<String> _emojiSuggestions = [
    '📦', '🍕', '👗', '💻', '📱', '🏠', '📚', '🧸',
    '⚽', '💄', '🛒', '🎮', '🌿', '💊', '🐾', '🚗',
    '✈️', '🎵', '🖼️', '🔧', '🍔', '🥦', '👟', '💍', '🎁'
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _parentNameCtrl.dispose();
    _subNameCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final token = AuthService.currentUser?.token;
      const url = '${ApiConfig.base}/admin/categories';
      final res = await http.get(Uri.parse(url),
          headers: {'Authorization': 'Bearer $token'});
      final data = json.decode(res.body);
      if (data['success'] == true) {
        setState(() {
          _categories = List<Map<String, dynamic>>.from(data['categories'] ?? []);
        });
      }
    } catch (e) {
      _snack('Failed to load: $e', Colors.red);
    }
    setState(() => _loading = false);
  }

  Future<void> _addParent() async {
    if (_parentNameCtrl.text.trim().isEmpty) {
      _snack('Name is required', Colors.orange);
      return;
    }
    try {
      final token = AuthService.currentUser?.token;
      final res = await http.post(
          Uri.parse('${ApiConfig.base}/admin/categories/parent'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json'
          },
          body: json.encode({
            'name': _parentNameCtrl.text.trim(),
            'emoji': _parentEmoji,
            'displayOrder': _parentOrder
          }));
      final data = json.decode(res.body);
      if (data['success'] == true) {
        _snack('Category added ✓', Colors.green);
        _parentNameCtrl.clear();
        _parentEmoji = '📦';
        setState(() => _showParentForm = false);
        _load();
      } else {
        _snack(data['message'] ?? 'Failed', Colors.red);
      }
    } catch (e) {
      _snack('Error: $e', Colors.red);
    }
  }

  Future<void> _addSub() async {
    if (_subParentId == null) {
      _snack('Select a parent category', Colors.orange);
      return;
    }
    if (_subNameCtrl.text.trim().isEmpty) {
      _snack('Name is required', Colors.orange);
      return;
    }
    try {
      final token = AuthService.currentUser?.token;
      final res = await http.post(
          Uri.parse('${ApiConfig.base}/admin/categories/sub'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json'
          },
          body: json.encode({
            'parentId': _subParentId,
            'name': _subNameCtrl.text.trim(),
            'emoji': _subEmoji,
            'displayOrder': _subOrder
          }));
      final data = json.decode(res.body);
      if (data['success'] == true) {
        _snack('Sub-category added ✓', Colors.green);
        _subNameCtrl.clear();
        _subEmoji = '';
        setState(() => _showSubForm = false);
        _load();
      } else {
        _snack(data['message'] ?? 'Failed', Colors.red);
      }
    } catch (e) {
      _snack('Error: $e', Colors.red);
    }
  }

  Future<void> _deleteCategory(int id, String name, bool hasChildren) async {
    final msg = hasChildren
        ? 'Delete "$name" and ALL sub-categories? This cannot be undone.'
        : 'Delete "$name"?';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Category'),
        content: Text(msg),
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
      final token = AuthService.currentUser?.token;
      final res = await http.post(
          Uri.parse('${ApiConfig.base}/admin/categories/$id/delete'),
          headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
          body: json.encode({}));
      final data = json.decode(res.body);
      _snack(data['message'] ?? (data['success'] == true ? 'Deleted' : 'Failed'),
          data['success'] == true ? Colors.green : Colors.red);
      if (data['success'] == true) _load();
    } catch (e) {
      _snack('Error: $e', Colors.red);
    }
  }

  void _showEditDialog(Map<String, dynamic> cat) {
    final nameCtrl = TextEditingController(text: cat['name'] as String? ?? '');
    String emoji = cat['emoji'] as String? ?? '📦';
    int order = cat['displayOrder'] as int? ?? 0;

    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setModal) => AlertDialog(
          title: const Text('Edit Category'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Name *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(children: [
                SizedBox(
                  width: 60,
                  child: TextField(
                    onChanged: (v) => setModal(() => emoji = v),
                    controller: TextEditingController(text: emoji),
                    decoration: const InputDecoration(
                        labelText: 'Emoji', border: OutlineInputBorder()),
                    textAlign: TextAlign.center,
                    maxLength: 4,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: _emojiSuggestions
                        .map((e) => GestureDetector(
                              onTap: () => setModal(() => emoji = e),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                    color: emoji == e
                                        ? Colors.black
                                        : Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(6)),
                                child: Text(e, style: const TextStyle(fontSize: 16)),
                              ),
                            ))
                        .toList(),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextField(
                keyboardType: TextInputType.number,
                onChanged: (v) => order = int.tryParse(v) ?? 0,
                controller: TextEditingController(text: '$order'),
                decoration: const InputDecoration(
                    labelText: 'Display Order', border: OutlineInputBorder()),
              ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  final token = AuthService.currentUser?.token;
                  final res = await http.post(
                      Uri.parse('${ApiConfig.base}/admin/categories/${cat['id']}/update'),
                      headers: {
                        'Authorization': 'Bearer $token',
                        'Content-Type': 'application/json'
                      },
                      body: json.encode({
                        'name': nameCtrl.text.trim(),
                        'emoji': emoji,
                        'displayOrder': order
                      }));
                  final data = json.decode(res.body);
                  _snack(data['message'] ?? (data['success'] == true ? 'Saved ✓' : 'Failed'),
                      data['success'] == true ? Colors.green : Colors.red);
                  if (data['success'] == true) _load();
                } catch (e) {
                  _snack('Error: $e', Colors.red);
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _snack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Category Management'),
        backgroundColor: Colors.amber.shade700,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                // Add parent category card
                Card(
                  color: Colors.amber.shade50,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.amber.shade200)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        const Text('➕ New Parent Category',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        const Spacer(),
                        TextButton(
                          onPressed: () =>
                              setState(() => _showParentForm = !_showParentForm),
                          child: Text(_showParentForm ? 'Cancel' : 'Expand'),
                        ),
                      ]),
                      if (_showParentForm) ...[
                        const SizedBox(height: 10),
                        Row(children: [
                          SizedBox(
                            width: 55,
                            child: TextFormField(
                              initialValue: _parentEmoji,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 22),
                              maxLength: 4,
                              decoration: const InputDecoration(
                                  counterText: '', border: OutlineInputBorder()),
                              onChanged: (v) => setState(() => _parentEmoji = v),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _parentNameCtrl,
                              decoration: const InputDecoration(
                                  labelText: 'Category Name *',
                                  border: OutlineInputBorder()),
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            width: 70,
                            child: TextFormField(
                              initialValue: '0',
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  labelText: 'Order', border: OutlineInputBorder()),
                              onChanged: (v) => _parentOrder = int.tryParse(v) ?? 0,
                            ),
                          ),
                        ]),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: _emojiSuggestions
                              .map((e) => GestureDetector(
                                    onTap: () => setState(() => _parentEmoji = e),
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                          color: _parentEmoji == e
                                              ? Colors.black
                                              : Colors.grey.shade100,
                                          borderRadius: BorderRadius.circular(6)),
                                      child: Text(e),
                                    ),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.black, foregroundColor: Colors.white),
                            onPressed: _addParent,
                            child: const Text('Add Category'),
                          ),
                        ),
                      ],
                    ]),
                  ),
                ),
                const SizedBox(height: 10),

                // Add sub-category card
                if (_categories.isNotEmpty)
                  Card(
                    color: Colors.green.shade50,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.green.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          const Text('➕ New Sub-Category',
                              style: TextStyle(fontWeight: FontWeight.bold)),
                          const Spacer(),
                          TextButton(
                            onPressed: () =>
                                setState(() => _showSubForm = !_showSubForm),
                            child: Text(_showSubForm ? 'Cancel' : 'Expand'),
                          ),
                        ]),
                        if (_showSubForm) ...[
                          const SizedBox(height: 10),
                          InputDecorator(
                            decoration: const InputDecoration(
                                labelText: 'Parent Category *',
                                border: OutlineInputBorder()),
                            child: DropdownButton<int>(
                              value: _subParentId,
                              isExpanded: true,
                              underline: const SizedBox.shrink(),
                              hint: const Text('Select parent…'),
                              items: _categories
                                  .map((c) => DropdownMenuItem<int>(
                                        value: c['id'] as int,
                                        child: Text(
                                            '${c['emoji'] ?? ''} ${c['name']}'),
                                      ))
                                  .toList(),
                              onChanged: (v) => setState(() => _subParentId = v),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(children: [
                            SizedBox(
                              width: 55,
                              child: TextFormField(
                                initialValue: _subEmoji,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 22),
                                maxLength: 4,
                                decoration: const InputDecoration(
                                    counterText: '', border: OutlineInputBorder()),
                                onChanged: (v) => setState(() => _subEmoji = v),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: _subNameCtrl,
                                decoration: const InputDecoration(
                                    labelText: 'Sub-Category Name *',
                                    border: OutlineInputBorder()),
                              ),
                            ),
                          ]),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green.shade700,
                                  foregroundColor: Colors.white),
                              onPressed: _addSub,
                              child: const Text('Add Sub-Category'),
                            ),
                          ),
                        ],
                      ]),
                    ),
                  ),
                const SizedBox(height: 10),

                // Category tree
                Text('${_categories.length} Parent Categories',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Colors.grey)),
                const SizedBox(height: 8),
                ..._categories.map((parent) {
                  final pId = parent['id'] as int? ?? 0;
                  final subs = List<Map<String, dynamic>>.from(
                      parent['subCategories'] ?? []);
                  final isExpanded = _expandedId == pId;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    child: Column(children: [
                      InkWell(
                        onTap: () => setState(
                            () => _expandedId = isExpanded ? null : pId),
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(children: [
                            Text(parent['emoji'] as String? ?? '📦',
                                style: const TextStyle(fontSize: 26)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(parent['name'] as String? ?? '',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold, fontSize: 15)),
                                Text('${subs.length} sub-categories · order ${parent['displayOrder'] ?? 0}',
                                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              ]),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 18),
                              onPressed: () => _showEditDialog(parent),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                              onPressed: () => _deleteCategory(
                                  pId, parent['name'] as String? ?? '', subs.isNotEmpty),
                            ),
                            Icon(
                              isExpanded ? Icons.expand_less : Icons.expand_more,
                              color: Colors.grey,
                            ),
                          ]),
                        ),
                      ),
                      if (isExpanded) ...[
                        const Divider(height: 1),
                        if (subs.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                            child: Text('No sub-categories yet',
                                style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                          )
                        else
                          ...subs.map((sub) => InkWell(
                                onTap: () {},
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(50, 10, 14, 10),
                                  child: Row(children: [
                                    Text(sub['emoji'] as String? ?? '—',
                                        style: const TextStyle(fontSize: 18)),
                                    const SizedBox(width: 8),
                                    Expanded(child: Text(sub['name'] as String? ?? '')),
                                    Text('order ${sub['displayOrder'] ?? 0}',
                                        style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                    IconButton(
                                      icon: const Icon(Icons.edit_outlined, size: 16),
                                      onPressed: () => _showEditDialog(sub),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, size: 16, color: Colors.red),
                                      onPressed: () => _deleteCategory(
                                          sub['id'] as int? ?? 0,
                                          sub['name'] as String? ?? '',
                                          false),
                                    ),
                                  ]),
                                ),
                              )),
                      ],
                    ]),
                  );
                }),
              ],
            ),
    );
  }
}