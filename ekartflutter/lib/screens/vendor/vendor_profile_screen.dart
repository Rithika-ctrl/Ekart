import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/vendor_profile_service.dart';
import '../../services/auth_service.dart';

class VendorProfileScreen extends StatefulWidget {
  const VendorProfileScreen({super.key});

  @override
  State<VendorProfileScreen> createState() => _VendorProfileScreenState();
}

class _VendorProfileScreenState extends State<VendorProfileScreen> {
  final nameCtrl   = TextEditingController();
  final mobileCtrl = TextEditingController();
  Map<String, dynamic>? profile;
  bool loading = true;
  bool saving  = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    mobileCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    final res = await VendorProfileService.getProfile();
    if (res['success'] == true) {
      final p = res['vendor'] as Map<String, dynamic>? ?? {};
      setState(() {
        profile = p;
        nameCtrl.text   = p['name']?.toString() ?? '';
        mobileCtrl.text = p['mobile']?.toString() ?? '';
        loading = false;
      });
    } else {
      // Fall back to cached session data
      final user = AuthService.currentUser;
      nameCtrl.text = user?.name ?? '';
      setState(() => loading = false);
    }
  }

  Future<void> _save() async {
    if (nameCtrl.text.trim().isEmpty) {
      _snack('Name cannot be empty', isError: true);
      return;
    }
    setState(() => saving = true);
    final res = await VendorProfileService.updateProfile(
      name: nameCtrl.text.trim(),
      mobile: mobileCtrl.text.trim(),
    );
    setState(() => saving = false);
    if (!mounted) return;
    _snack(
      res['message'] ??
          (res['success'] == true ? 'Profile updated!' : 'Update failed'),
      isError: res['success'] != true,
    );
    if (res['success'] == true) _load();
  }

  void _snack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red : Colors.green,
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Front Profile',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: saving ? null : _save,
            child: saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Text('Save',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  // Avatar
                  Center(
                    child: CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.indigo.shade100,
                      child: Text(
                        (nameCtrl.text.isNotEmpty
                            ? nameCtrl.text[0]
                            : (user?.name != null && user!.name.isNotEmpty)
                                ? user.name[0]
                                : 'V')
                            .toUpperCase(),
                        style: TextStyle(
                            fontSize: 40,
                            fontWeight: FontWeight.bold,
                            color: Colors.indigo.shade700),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (user?.vendorCode != null)
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.indigo.shade50,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.indigo.shade200),
                        ),
                        child: Text(
                          'Vendor Code: ${user!.vendorCode}',
                          style: TextStyle(
                              color: Colors.indigo.shade700,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  const SizedBox(height: 28),

                  const Text('Store Information',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 14),

                  // Name
                  TextField(
                    controller: nameCtrl,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Store Owner Name',
                      prefixIcon: Icon(Icons.store_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Email (read-only)
                  TextField(
                    readOnly: true,
                    decoration: InputDecoration(
                      labelText: 'Email Address (read-only)',
                      prefixIcon: const Icon(Icons.email_outlined),
                      border: const OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.grey[100],
                    ),
                    controller: TextEditingController(
                        text: profile?['email'] ?? user?.email ?? ''),
                  ),
                  const SizedBox(height: 14),

                  // Mobile
                  TextField(
                    controller: mobileCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Mobile Number',
                      prefixIcon: Icon(Icons.phone_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 28),

                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: saving ? null : _save,
                      icon: saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2.5))
                          : const Icon(Icons.save_outlined),
                      label: Text(saving ? 'Saving...' : 'Save Changes',
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo.shade700,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
