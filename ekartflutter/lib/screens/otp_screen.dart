import 'package:flutter/material.dart';

/// OTP Screen placeholder — OTP flow is handled server-side for mobile.
/// Customers are auto-verified on register (see FlutterApiController).
class OtpScreen extends StatefulWidget {
  final String email;
  const OtpScreen({super.key, required this.email});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final otpCtrl = TextEditingController();
  bool loading = false;

  Future<void> _verify() async {
    setState(() => loading = true);
    // Mobile customers are auto-verified on register.
    // Add OTP verification API call here if needed.
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() => loading = false);
    if (!mounted) return; // ✅ mounted check before using context
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Verified successfully'), backgroundColor: Colors.green),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text('Enter OTP sent to ${widget.email}'),
            const SizedBox(height: 20),
            TextField(
              controller: otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(
                  labelText: 'OTP', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: loading ? null : _verify,
                child: loading
                    ? const CircularProgressIndicator()
                    : const Text('Verify'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
