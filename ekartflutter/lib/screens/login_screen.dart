import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'customer/customer_home_screen.dart';
import 'vendor/vendor_dashboard_screen.dart';
import 'admin/admin_dashboard.dart';
import 'delivery/delivery_home_screen.dart';
import 'register_screen.dart';
import 'delivery/delivery_register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey     = GlobalKey<FormState>();
  final emailCtrl    = TextEditingController();
  final passwordCtrl = TextEditingController();
  String role          = 'CUSTOMER';
  bool   loading       = false;
  bool   obscurePass   = true;

  static const _roles = ['CUSTOMER', 'VENDOR', 'ADMIN', 'DELIVERY_BOY'];

  @override
  void dispose() { emailCtrl.dispose(); passwordCtrl.dispose(); super.dispose(); }

  Color get _roleColor {
    switch (role) {
      case 'VENDOR':       return Colors.indigo.shade700;
      case 'ADMIN':        return Colors.red.shade700;
      case 'DELIVERY_BOY': return Colors.teal.shade700;
      default:             return Colors.blue.shade700;
    }
  }

  IconData get _roleIcon {
    switch (role) {
      case 'VENDOR':       return Icons.store;
      case 'ADMIN':        return Icons.admin_panel_settings;
      case 'DELIVERY_BOY': return Icons.delivery_dining;
      default:             return Icons.shopping_bag;
    }
  }

  String get _roleLabel {
    switch (role) {
      case 'VENDOR':       return 'Vendor';
      case 'ADMIN':        return 'Admin';
      case 'DELIVERY_BOY': return 'Delivery Boy';
      default:             return 'Customer';
    }
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => loading = true);

    final Map<String, dynamic> res;
    switch (role) {
      case 'VENDOR':
        res = await AuthService.vendorLogin(emailCtrl.text.trim(), passwordCtrl.text);
        break;
      case 'ADMIN':
        res = await AuthService.adminLogin(emailCtrl.text.trim(), passwordCtrl.text);
        break;
      case 'DELIVERY_BOY':
        res = await AuthService.deliveryBoyLogin(emailCtrl.text.trim(), passwordCtrl.text);
        break;
      default:
        res = await AuthService.customerLogin(emailCtrl.text.trim(), passwordCtrl.text);
    }

    setState(() => loading = false);
    if (!mounted) return;

    if (res['success'] == true) {
      // Check delivery boy pending approval
      if (role == 'DELIVERY_BOY' && res['status'] == 'pending') {
        _showPendingDialog();
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(role == 'ADMIN' ? 'Welcome, Admin!' : 'Welcome back, ${res['name'] ?? ''}! 🎉'),
        backgroundColor: Colors.green,
      ));
      final Widget dest;
      switch (role) {
        case 'VENDOR':       dest = const VendorDashboardScreen(); break;
        case 'ADMIN':        dest = const AdminDashboard();        break;
        case 'DELIVERY_BOY': dest = const DeliveryHomeScreen();    break;
        default:             dest = const CustomerHomeScreen();
      }
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => dest));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['message'] ?? 'Login failed'),
        backgroundColor: Colors.red,
      ));
    }
  }

  void _showPendingDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Row(children: [
          Icon(Icons.hourglass_top, color: Colors.orange),
          SizedBox(width: 8),
          Text('Approval Pending'),
        ]),
        content: const Text(
          'Your account is pending admin approval.\n\n'
          'You will be able to login once an admin approves your registration.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              // Logo
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _roleColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                        color: _roleColor.withValues(alpha: 0.35),
                        blurRadius: 18, spreadRadius: 4),
                  ],
                ),
                child: Icon(_roleIcon, color: Colors.white, size: 44),
              ),
              const SizedBox(height: 16),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 200),
                style: TextStyle(
                    fontSize: 26, fontWeight: FontWeight.bold, color: _roleColor),
                child: Text('Ekart — $_roleLabel'),
              ),
              const SizedBox(height: 32),

              // Role selector
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: _roles.map((r) {
                    final selected = r == role;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => role = r),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: selected ? _roleColorFor(r) : Colors.transparent,
                            borderRadius: BorderRadius.circular(11),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(_iconFor(r),
                                  color: selected ? Colors.white : Colors.grey,
                                  size: 18),
                              const SizedBox(height: 2),
                              Text(_shortLabel(r),
                                  style: TextStyle(
                                      color: selected ? Colors.white : Colors.grey,
                                      fontSize: 10,
                                      fontWeight: selected
                                          ? FontWeight.bold
                                          : FontWeight.normal)),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 24),

              // Email field
              TextFormField(
                controller: emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Enter email' : null,
              ),
              const SizedBox(height: 16),

              // Password field
              TextFormField(
                controller: passwordCtrl,
                obscureText: obscurePass,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outlined),
                  suffixIcon: IconButton(
                    icon: Icon(
                        obscurePass ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => obscurePass = !obscurePass),
                  ),
                ),
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Enter password' : null,
              ),
              const SizedBox(height: 24),

              // Login button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: _roleColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  onPressed: loading ? null : _login,
                  child: loading
                      ? const SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text('Login as $_roleLabel',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),

              // Register links
              if (role == 'CUSTOMER' || role == 'VENDOR')
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text("Don't have an account? ",
                      style: TextStyle(color: Colors.grey[600])),
                  GestureDetector(
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => RegisterScreen(initialRole: role))),
                    child: Text('Register',
                        style: TextStyle(
                            color: _roleColor, fontWeight: FontWeight.bold)),
                  ),
                ]),

              if (role == 'DELIVERY_BOY') ...[
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text("New delivery partner? ",
                      style: TextStyle(color: Colors.grey[600])),
                  GestureDetector(
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(
                            builder: (_) => const DeliveryRegisterScreen())),
                    child: Text('Register here',
                        style: TextStyle(
                            color: _roleColor, fontWeight: FontWeight.bold)),
                  ),
                ]),
                const SizedBox(height: 8),
                Text(
                  'Note: Account requires admin approval after registration.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ]),
          ),
        ),
      ),
    );
  }

  Color _roleColorFor(String r) {
    switch (r) {
      case 'VENDOR':       return Colors.indigo.shade700;
      case 'ADMIN':        return Colors.red.shade700;
      case 'DELIVERY_BOY': return Colors.teal.shade700;
      default:             return Colors.blue.shade700;
    }
  }

  IconData _iconFor(String r) {
    switch (r) {
      case 'VENDOR':       return Icons.store;
      case 'ADMIN':        return Icons.admin_panel_settings;
      case 'DELIVERY_BOY': return Icons.delivery_dining;
      default:             return Icons.shopping_bag;
    }
  }

  String _shortLabel(String r) {
    switch (r) {
      case 'VENDOR':       return 'Vendor';
      case 'ADMIN':        return 'Admin';
      case 'DELIVERY_BOY': return 'Delivery';
      default:             return 'Customer';
    }
  }
}
