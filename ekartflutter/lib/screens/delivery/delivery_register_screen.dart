import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/api_config.dart';
import '../login_screen.dart';

class DeliveryRegisterScreen extends StatefulWidget {
  const DeliveryRegisterScreen({super.key});
  @override
  State<DeliveryRegisterScreen> createState() => _DeliveryRegisterScreenState();
}

class _DeliveryRegisterScreenState extends State<DeliveryRegisterScreen> {
  final _formKey        = GlobalKey<FormState>();
  final _nameCtrl       = TextEditingController();
  final _emailCtrl      = TextEditingController();
  final _mobileCtrl     = TextEditingController();
  final _passwordCtrl   = TextEditingController();
  final _confirmCtrl    = TextEditingController();

  bool _loading        = false;
  bool _obscurePass    = true;
  bool _obscureConfirm = true;
  List<Map<String, dynamic>> _warehouses    = [];
  int? _selectedWarehouseId;

  @override
  void initState() {
    super.initState();
    _loadWarehouses();
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _mobileCtrl.dispose();
    _passwordCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadWarehouses() async {
    try {
      final r = await http.get(Uri.parse(ApiConfig.deliveryWarehouses));
      final body = r.body.trim();
      if (body.startsWith('[')) {
        setState(() {
          _warehouses = List<Map<String, dynamic>>.from(jsonDecode(body));
        });
      }
    } catch (_) {}
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final r = await http.post(
        Uri.parse(ApiConfig.deliveryRegister),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'mobile': _mobileCtrl.text.trim(),
          'password': _passwordCtrl.text,
          'confirmPassword': _confirmCtrl.text,
          'warehouseId': _selectedWarehouseId ?? 0,
          'flutter': true,
        }),
      );
      final body = r.body.trim();
      final Map<String, dynamic> d;
      if (body.startsWith('{')) {
        d = jsonDecode(body) as Map<String, dynamic>;
      } else {
        d = {'success': r.statusCode == 200, 'message': 'Registration submitted.'};
      }

      setState(() => _loading = false);
      if (!mounted) return;

      if (d['success'] == true || r.statusCode == 302 || r.statusCode == 200) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (_) => AlertDialog(
            title: const Row(children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text('Registered!'),
            ]),
            content: const Text(
              'Your delivery partner account has been created.\n\n'
              'Please verify your email with the OTP sent, then wait for admin approval before logging in.',
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pushReplacement(context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()));
                },
                child: const Text('Go to Login', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      } else {
        _snack(d['message'] ?? 'Registration failed', Colors.red);
      }
    } catch (e) {
      setState(() => _loading = false);
      _snack('Connection error: $e', Colors.red);
    }
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: color));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Delivery Partner Registration'),
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.teal.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.teal.shade200),
              ),
              child: Row(children: [
                Icon(Icons.delivery_dining, color: Colors.teal.shade700, size: 32),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Join Ekart Delivery',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16,
                          color: Colors.teal.shade800)),
                  const SizedBox(height: 2),
                  Text('Register to become a delivery partner. Admin approval required.',
                      style: TextStyle(color: Colors.teal.shade600, fontSize: 12)),
                ])),
              ]),
            ),
            const SizedBox(height: 24),

            _label('Full Name'),
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.person_outline), hintText: 'Your full name'),
              validator: (v) => (v == null || v.trim().length < 3)
                  ? 'Name must be at least 3 characters' : null,
            ),
            const SizedBox(height: 16),

            _label('Email Address'),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.email_outlined), hintText: 'email@example.com'),
              validator: (v) => (v == null || !v.contains('@'))
                  ? 'Enter a valid email' : null,
            ),
            const SizedBox(height: 16),

            _label('Mobile Number'),
            TextFormField(
              controller: _mobileCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.phone_outlined), hintText: '10-digit mobile number'),
              validator: (v) => (v == null || v.length != 10)
                  ? 'Enter valid 10-digit number' : null,
            ),
            const SizedBox(height: 16),

            _label('Password'),
            TextFormField(
              controller: _passwordCtrl,
              obscureText: _obscurePass,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outlined),
                hintText: 'Minimum 8 characters',
                suffixIcon: IconButton(
                  icon: Icon(_obscurePass ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscurePass = !_obscurePass),
                ),
              ),
              validator: (v) => (v == null || v.length < 8)
                  ? 'Password must be at least 8 characters' : null,
            ),
            const SizedBox(height: 16),

            _label('Confirm Password'),
            TextFormField(
              controller: _confirmCtrl,
              obscureText: _obscureConfirm,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outlined),
                hintText: 'Repeat password',
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
              ),
              validator: (v) => v != _passwordCtrl.text ? 'Passwords do not match' : null,
            ),
            const SizedBox(height: 16),

            _label('Preferred Warehouse (Optional)'),
            DropdownButtonFormField<int>(
              initialValue: _selectedWarehouseId,
              hint: const Text('Select a warehouse (optional)'),
              items: [
                const DropdownMenuItem<int>(value: null, child: Text('No preference')),
                ..._warehouses.map((w) => DropdownMenuItem<int>(
                      value: w['id'] as int?,
                      child: Text('${w['name']} — ${w['city']}, ${w['state']}'),
                    )),
              ],
              onChanged: (v) => setState(() => _selectedWarehouseId = v),
              decoration: const InputDecoration(prefixIcon: Icon(Icons.warehouse_outlined)),
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                onPressed: _loading ? null : _register,
                child: _loading
                    ? const SizedBox(width: 22, height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Register as Delivery Partner',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 16),

            Center(child: TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Back to Login'),
            )),
          ]),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
  );
}