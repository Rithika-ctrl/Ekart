import 'package:flutter/material.dart';
import '../../services/security_service.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  final _formKey       = GlobalKey<FormState>();
  final currentCtrl    = TextEditingController();
  final newCtrl        = TextEditingController();
  final confirmCtrl    = TextEditingController();
  bool saving          = false;
  bool obscureCurrent  = true;
  bool obscureNew      = true;
  bool obscureConfirm  = true;

  @override
  void dispose() {
    currentCtrl.dispose();
    newCtrl.dispose();
    confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => saving = true);
    final res = await SecurityService.changePassword(
      currentPassword: currentCtrl.text,
      newPassword: newCtrl.text,
    );
    setState(() => saving = false);
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['message'] ??
          (res['success'] == true ? 'Password changed!' : 'Failed')),
      backgroundColor:
          res['success'] == true ? Colors.green : Colors.red,
      behavior: SnackBarBehavior.floating,
    ));

    if (res['success'] == true) {
      currentCtrl.clear();
      newCtrl.clear();
      confirmCtrl.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security Settings',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Info banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Row(children: [
                  Icon(Icons.lock_outline,
                      color: Colors.blue.shade700, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Choose a strong password with uppercase, number and special character.',
                      style: TextStyle(
                          color: Colors.blue.shade800, fontSize: 13),
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 28),

              const Text('Change Password',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              // Current password
              TextFormField(
                controller: currentCtrl,
                obscureText: obscureCurrent,
                decoration: InputDecoration(
                  labelText: 'Current Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(obscureCurrent
                        ? Icons.visibility_off
                        : Icons.visibility),
                    onPressed: () =>
                        setState(() => obscureCurrent = !obscureCurrent),
                  ),
                ),
                validator: (v) => (v == null || v.isEmpty)
                    ? 'Enter your current password'
                    : null,
              ),
              const SizedBox(height: 14),

              // New password
              TextFormField(
                controller: newCtrl,
                obscureText: obscureNew,
                decoration: InputDecoration(
                  labelText: 'New Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  helperText: 'Min 8 chars, uppercase, number, special char',
                  suffixIcon: IconButton(
                    icon: Icon(
                        obscureNew ? Icons.visibility_off : Icons.visibility),
                    onPressed: () =>
                        setState(() => obscureNew = !obscureNew),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Enter a new password';
                  if (v.length < 8) return 'Minimum 8 characters required';
                  if (!RegExp(r'[A-Z]').hasMatch(v)) {
                    return 'Include at least one uppercase letter';
                  }
                  if (!RegExp(r'[0-9]').hasMatch(v)) {
                    return 'Include at least one number';
                  }
                  if (!RegExp(r'[!@#\$&*~%^()_\-+=\[\]{};:,.<>?/\\|]')
                      .hasMatch(v)) {
                    return 'Include at least one special character';
                  }
                  if (v == currentCtrl.text) {
                    return 'New password must differ from current';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),

              // Confirm new password
              TextFormField(
                controller: confirmCtrl,
                obscureText: obscureConfirm,
                decoration: InputDecoration(
                  labelText: 'Confirm New Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(obscureConfirm
                        ? Icons.visibility_off
                        : Icons.visibility),
                    onPressed: () =>
                        setState(() => obscureConfirm = !obscureConfirm),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) { return 'Please confirm your new password'; }
                  if (v != newCtrl.text) return 'Passwords do not match';
                  return null;
                },
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
                      : const Icon(Icons.check),
                  label: Text(saving ? 'Updating...' : 'Update Password',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
