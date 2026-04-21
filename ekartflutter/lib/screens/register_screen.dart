// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import '../services/auth_service.dart';

// class RegisterScreen extends StatefulWidget {
//   final String initialRole;
//   const RegisterScreen({super.key, this.initialRole = 'CUSTOMER'});
//   @override
//   State<RegisterScreen> createState() => _RegisterScreenState();
// }

// class _RegisterScreenState extends State<RegisterScreen> {
//   final _formKey     = GlobalKey<FormState>();
//   final nameCtrl     = TextEditingController();
//   final emailCtrl    = TextEditingController();
//   final mobileCtrl   = TextEditingController();
//   final passwordCtrl = TextEditingController();
//   final confirmCtrl  = TextEditingController();

//   late String role;
//   bool loading        = false;
//   bool obscurePass    = true;
//   bool obscureConfirm = true;

//   @override
//   void initState() { super.initState(); role = widget.initialRole; }

//   @override
//   void dispose() {
//     nameCtrl.dispose(); emailCtrl.dispose(); mobileCtrl.dispose();
//     passwordCtrl.dispose(); confirmCtrl.dispose();
//     super.dispose();
//   }

//   Color get _roleColor =>
//       role == 'VENDOR' ? Colors.indigo.shade700 : Colors.blue.shade700;

//   Future<void> _register() async {
//     if (!_formKey.currentState!.validate()) return;
//     setState(() => loading = true);
//     final res = role == 'VENDOR'
//         ? await AuthService.vendorRegister(
//             nameCtrl.text.trim(), emailCtrl.text.trim(),
//             mobileCtrl.text.trim(), passwordCtrl.text)
//         : await AuthService.customerRegister(
//             nameCtrl.text.trim(), emailCtrl.text.trim(),
//             mobileCtrl.text.trim(), passwordCtrl.text);
//     setState(() => loading = false);
//     if (!mounted) return;

//     if (res['success'] == true) {
//       ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//         content: Text(res['message'] ?? 'Account created successfully!'),
//         backgroundColor: Colors.green.shade700,
//         behavior: SnackBarBehavior.floating,
//       ));
//       await Future.delayed(const Duration(milliseconds: 700));
//       if (mounted) Navigator.pop(context);
//     } else {
//       ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//         content: Text(res['message'] ?? 'Registration failed. Please try again.'),
//         backgroundColor: Colors.red.shade700,
//         behavior: SnackBarBehavior.floating,
//         duration: const Duration(seconds: 4),
//       ));
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(
//         title: Text(role == 'VENDOR'
//             ? 'Vendor Registration'
//             : 'Customer Registration',
//             style: const TextStyle(fontWeight: FontWeight.bold)),
//         backgroundColor: _roleColor,
//         foregroundColor: Colors.white,
//       ),
//       backgroundColor: Colors.grey[50],
//       body: SingleChildScrollView(
//         padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
//         child: Form(
//           key: _formKey,
//           child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//             // Role toggle
//             Container(
//               decoration: BoxDecoration(
//                   color: Colors.grey[200],
//                   borderRadius: BorderRadius.circular(12)),
//               padding: const EdgeInsets.all(4),
//               child: Row(children: [
//                 _roleBtn('CUSTOMER', Icons.person, 'Customer'),
//                 _roleBtn('VENDOR', Icons.store, 'Vendor'),
//               ]),
//             ),
//             const SizedBox(height: 24),

//             TextFormField(
//               controller: nameCtrl,
//               textCapitalization: TextCapitalization.words,
//               decoration: const InputDecoration(
//                   labelText: 'Full Name',
//                   prefixIcon: Icon(Icons.badge_outlined)),
//               validator: (v) {
//                 if (v == null || v.trim().isEmpty) return 'Name is required';
//                 if (v.trim().length < 3) return 'At least 3 characters';
//                 return null;
//               },
//             ),
//             const SizedBox(height: 14),

//             TextFormField(
//               controller: emailCtrl,
//               keyboardType: TextInputType.emailAddress,
//               decoration: const InputDecoration(
//                   labelText: 'Email Address',
//                   prefixIcon: Icon(Icons.email_outlined)),
//               validator: (v) {
//                 if (v == null || v.trim().isEmpty) return 'Email is required';
//                 if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v.trim()))
//                   { return 'Enter a valid email'; }
//                 return null;
//               },
//             ),
//             const SizedBox(height: 14),

//             TextFormField(
//               controller: mobileCtrl,
//               keyboardType: TextInputType.number,
//               inputFormatters: [
//                 FilteringTextInputFormatter.digitsOnly,
//                 LengthLimitingTextInputFormatter(10),
//               ],
//               decoration: const InputDecoration(
//                   labelText: 'Mobile (10 digits)',
//                   prefixIcon: Icon(Icons.phone_outlined)),
//               validator: (v) {
//                 if (v == null || v.trim().isEmpty) return 'Mobile is required';
//                 if (v.trim().length != 10) return '10-digit number required';
//                 return null;
//               },
//             ),
//             const SizedBox(height: 14),

//             TextFormField(
//               controller: passwordCtrl,
//               obscureText: obscurePass,
//               decoration: InputDecoration(
//                 labelText: 'Password',
//                 prefixIcon: const Icon(Icons.lock_outline),
//                 helperText: 'Min 8 chars: uppercase, number & special char',
//                 helperMaxLines: 2,
//                 suffixIcon: IconButton(
//                   icon: Icon(
//                       obscurePass ? Icons.visibility_off : Icons.visibility),
//                   onPressed: () =>
//                       setState(() => obscurePass = !obscurePass),
//                 ),
//               ),
//               validator: (v) {
//                 if (v == null || v.isEmpty) return 'Password is required';
//                 if (v.length < 8) return 'Minimum 8 characters';
//                 if (!RegExp(r'[A-Z]').hasMatch(v))
//                   { return 'Include at least one uppercase letter'; }
//                 if (!RegExp(r'[0-9]').hasMatch(v))
//                   { return 'Include at least one number'; }
//                 if (!RegExp(r'[!@#\$&*~%^()_\-+=\[\]{};:,.<>?/\\|]').hasMatch(v))
//                   { return 'Include at least one special character'; }
//                 return null;
//               },
//             ),
//             const SizedBox(height: 14),

//             TextFormField(
//               controller: confirmCtrl,
//               obscureText: obscureConfirm,
//               decoration: InputDecoration(
//                 labelText: 'Confirm Password',
//                 prefixIcon: const Icon(Icons.lock_outline),
//                 suffixIcon: IconButton(
//                   icon: Icon(
//                       obscureConfirm ? Icons.visibility_off : Icons.visibility),
//                   onPressed: () =>
//                       setState(() => obscureConfirm = !obscureConfirm),
//                 ),
//               ),
//               validator: (v) {
//                 if (v == null || v.isEmpty) return 'Please confirm password';
//                 if (v != passwordCtrl.text) return 'Passwords do not match';
//                 return null;
//               },
//             ),
//             const SizedBox(height: 20),

//             if (role == 'VENDOR') ...[
//               Container(
//                 padding: const EdgeInsets.all(14),
//                 decoration: BoxDecoration(
//                   color: Colors.amber.shade50,
//                   border: Border.all(color: Colors.amber.shade300),
//                   borderRadius: BorderRadius.circular(10),
//                 ),
//                 child: Row(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Icon(Icons.info_outline,
//                         color: Colors.amber.shade800, size: 20),
//                     const SizedBox(width: 10),
//                     Expanded(
//                       child: Text(
//                         'Vendor accounts require admin approval to add products. '
//                         'You can log in immediately after registering.',
//                         style: TextStyle(
//                             color: Colors.amber.shade900, fontSize: 13),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//               const SizedBox(height: 20),
//             ],

//             SizedBox(
//               width: double.infinity,
//               height: 52,
//               child: ElevatedButton(
//                 onPressed: loading ? null : _register,
//                 style: ElevatedButton.styleFrom(
//                   backgroundColor: _roleColor,
//                   foregroundColor: Colors.white,
//                   shape: RoundedRectangleBorder(
//                       borderRadius: BorderRadius.circular(10)),
//                 ),
//                 child: loading
//                     ? const SizedBox(
//                         width: 22, height: 22,
//                         child: CircularProgressIndicator(
//                             color: Colors.white, strokeWidth: 2.5))
//                     : Text(
//                         'Create ${role == 'VENDOR' ? 'Vendor' : 'Customer'} Account',
//                         style: const TextStyle(
//                             fontSize: 16, fontWeight: FontWeight.bold)),
//               ),
//             ),
//             const SizedBox(height: 20),

//             Row(mainAxisAlignment: MainAxisAlignment.center, children: [
//               Text('Already have an account?  ',
//                   style: TextStyle(color: Colors.grey[600])),
//               GestureDetector(
//                 onTap: () => Navigator.pop(context),
//                 child: Text('Sign In',
//                     style: TextStyle(
//                         color: _roleColor, fontWeight: FontWeight.bold)),
//               ),
//             ]),
//           ]),
//         ),
//       ),
//     );
//   }

//   Widget _roleBtn(String value, IconData icon, String label) {
//     final selected = role == value;
//     final color =
//         value == 'VENDOR' ? Colors.indigo.shade700 : Colors.blue.shade700;
//     return Expanded(
//       child: GestureDetector(
//         onTap: () => setState(() => role = value),
//         child: AnimatedContainer(
//           duration: const Duration(milliseconds: 180),
//           padding: const EdgeInsets.symmetric(vertical: 10),
//           decoration: BoxDecoration(
//             color: selected ? color : Colors.transparent,
//             borderRadius: BorderRadius.circular(9),
//           ),
//           child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
//             Icon(icon, size: 18,
//                 color: selected ? Colors.white : Colors.grey[600]),
//             const SizedBox(width: 6),
//             Text(label,
//                 style: TextStyle(
//                     fontSize: 13,
//                     fontWeight: FontWeight.w600,
//                     color: selected ? Colors.white : Colors.grey[600])),
//           ]),
//         ),
//       ),
//     );
//   }
// }


import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';
import '../screens/customer/customer_home_screen.dart';

class RegisterScreen extends StatefulWidget {
  final String initialRole;
  const RegisterScreen({super.key, this.initialRole = 'CUSTOMER'});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _step = 1; // 1 = form, 2 = OTP

  final _formKey     = GlobalKey<FormState>();
  final nameCtrl     = TextEditingController();
  final emailCtrl    = TextEditingController();
  final mobileCtrl   = TextEditingController();
  final passwordCtrl = TextEditingController();
  final confirmCtrl  = TextEditingController();

  final List<TextEditingController> _otpCtrl =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocus = List.generate(6, (_) => FocusNode());

  late String role;
  bool _loading     = false;
  bool _obscurePass = true;
  bool _obscureConf = true;
  String _otpError  = '';
  int  _resendSecs  = 0;
  Timer? _resendTimer;

  @override
  void initState() { super.initState(); role = widget.initialRole; }

  @override
  void dispose() {
    nameCtrl.dispose(); emailCtrl.dispose();
    mobileCtrl.dispose(); passwordCtrl.dispose(); confirmCtrl.dispose();
    for (final c in _otpCtrl) { c.dispose(); }
    for (final f in _otpFocus) { f.dispose(); }
    _resendTimer?.cancel();
    super.dispose();
  }

  Color get _color =>
      role == 'VENDOR' ? Colors.indigo.shade700 : Colors.blue.shade700;

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final res = await AuthService.customerSendOtp(
      nameCtrl.text.trim(), emailCtrl.text.trim(),
      mobileCtrl.text.trim(), passwordCtrl.text);
    setState(() => _loading = false);
    if (!mounted) return;
    if (res['success'] == true) {
      setState(() { _step = 2; _otpError = ''; });
      _startCooldown();
      _snack(res['message'] ?? 'OTP sent!', Colors.green);
    } else {
      _snack(res['message'] ?? 'Failed to send OTP.', Colors.red);
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.map((c) => c.text).join();
    if (otp.length != 6) {
      setState(() => _otpError = 'Enter all 6 digits');
      return;
    }
    setState(() { _loading = true; _otpError = ''; });
    final res = await AuthService.customerVerifyOtp(emailCtrl.text.trim(), otp);
    setState(() => _loading = false);
    if (!mounted) return;
    if (res['success'] == true) {
      _snack('Account verified! Welcome to Ekart!', Colors.green);
      await Future.delayed(const Duration(milliseconds: 600));
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(context,
          MaterialPageRoute(builder: (_) => const CustomerHomeScreen()),
          (_) => false);
    } else {
      setState(() => _otpError = res['message'] ?? 'Invalid OTP.');
    }
  }

  void _startCooldown() {
    setState(() => _resendSecs = 60);
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendSecs <= 1) { t.cancel(); if (mounted) setState(() => _resendSecs = 0); }
      else { if (mounted) setState(() => _resendSecs--); }
    });
  }

  Future<void> _resend() async {
    if (_resendSecs > 0 || _loading) return;
    setState(() => _loading = true);
    final res = await AuthService.customerSendOtp(
      nameCtrl.text.trim(), emailCtrl.text.trim(),
      mobileCtrl.text.trim(), passwordCtrl.text);
    setState(() => _loading = false);
    if (!mounted) return;
    if (res['success'] == true) {
      _snack('OTP resent to ${emailCtrl.text.trim()}', Colors.blue);
      _startCooldown();
      for (final c in _otpCtrl) { c.clear(); }
      _otpFocus[0].requestFocus();
    } else {
      _snack(res['message'] ?? 'Could not resend OTP', Colors.red);
    }
  }

  void _snack(String msg, Color color) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(msg), backgroundColor: color,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4)));

  void _onOtpDigit(String val, int i) {
    if (val.isNotEmpty && i < 5) _otpFocus[i + 1].requestFocus();
    if (val.isEmpty && i > 0)   _otpFocus[i - 1].requestFocus();
    if (mounted) setState(() => _otpError = '');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _step == 1
              ? (role == 'VENDOR' ? 'Vendor Registration' : 'Customer Registration')
              : 'Verify Your Email',
          style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: _color,
        foregroundColor: Colors.white,
        leading: _step == 2
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() {
                  _step = 1; _otpError = '';
                  _resendTimer?.cancel(); _resendSecs = 0;
                  for (final c in _otpCtrl) { c.clear(); }
                }))
            : null,
      ),
      backgroundColor: Colors.grey[50],
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: _step == 1 ? _formStep() : _otpStep(),
      ),
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────
  Widget _formStep() => SingleChildScrollView(
    key: const ValueKey('form'),
    padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
    child: Form(
      key: _formKey,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Role toggle
        Container(
          decoration: BoxDecoration(
              color: Colors.grey[200], borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.all(4),
          child: Row(children: [
            _roleBtn('CUSTOMER', Icons.person, 'Customer'),
            _roleBtn('VENDOR', Icons.store, 'Vendor'),
          ]),
        ),
        const SizedBox(height: 24),

        // Name
        TextFormField(
          controller: nameCtrl,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
              labelText: 'Full Name', prefixIcon: Icon(Icons.badge_outlined)),
          validator: (v) {
            if (v == null || v.trim().isEmpty) return 'Name is required';
            if (v.trim().length < 3) return 'At least 3 characters';
            return null;
          },
        ),
        const SizedBox(height: 14),

        // Email
        TextFormField(
          controller: emailCtrl,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
              labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined)),
          validator: (v) {
            if (v == null || v.trim().isEmpty) return 'Email is required';
            if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v.trim()))
              { return 'Enter a valid email'; }
            return null;
          },
        ),
        const SizedBox(height: 14),

        // Mobile
        TextFormField(
          controller: mobileCtrl,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          decoration: const InputDecoration(
              labelText: 'Mobile (10 digits)', prefixIcon: Icon(Icons.phone_outlined)),
          validator: (v) {
            if (v == null || v.trim().isEmpty) return 'Mobile is required';
            if (v.trim().length != 10) return '10-digit number required';
            return null;
          },
        ),
        const SizedBox(height: 14),

        // Password
        TextFormField(
          controller: passwordCtrl,
          obscureText: _obscurePass,
          decoration: InputDecoration(
            labelText: 'Password',
            prefixIcon: const Icon(Icons.lock_outline),
            helperText: 'Min 8 chars: uppercase, number & special char',
            helperMaxLines: 2,
            suffixIcon: IconButton(
              icon: Icon(_obscurePass ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscurePass = !_obscurePass),
            ),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Password is required';
            if (v.length < 8) return 'Minimum 8 characters';
            if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Include at least one uppercase letter';
            if (!RegExp(r'[0-9]').hasMatch(v)) return 'Include at least one number';
            if (!RegExp(r'[!@#\$&*~%^()_\-+=\[\]{};:,.<>?/\\|]').hasMatch(v))
              { return 'Include at least one special character'; }
            return null;
          },
        ),
        const SizedBox(height: 14),

        // Confirm Password
        TextFormField(
          controller: confirmCtrl,
          obscureText: _obscureConf,
          decoration: InputDecoration(
            labelText: 'Confirm Password',
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_obscureConf ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscureConf = !_obscureConf),
            ),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Please confirm password';
            if (v != passwordCtrl.text) return 'Passwords do not match';
            return null;
          },
        ),
        const SizedBox(height: 20),

        // OTP info banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            border: Border.all(color: Colors.blue.shade200),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.mark_email_read_outlined,
                color: Colors.blue.shade700, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text(
              'A 6-digit OTP will be sent to your email to verify your account.',
              style: TextStyle(color: Colors.blue.shade800, fontSize: 13),
            )),
          ]),
        ),
        const SizedBox(height: 20),

        // Send OTP button
        SizedBox(
          width: double.infinity, height: 52,
          child: ElevatedButton.icon(
            onPressed: _loading ? null : _sendOtp,
            icon: _loading
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                : const Icon(Icons.send_outlined),
            label: Text(_loading ? 'Sending OTP…' : 'Send OTP & Continue',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
                backgroundColor: _color, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          ),
        ),
        const SizedBox(height: 20),

        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text('Already have an account?  ',
              style: TextStyle(color: Colors.grey[600])),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Text('Sign In',
                style: TextStyle(color: _color, fontWeight: FontWeight.bold)),
          ),
        ]),
      ]),
    ),
  );

  // ── OTP Verification Step ─────────────────────────────────────────────────
  Widget _otpStep() => SingleChildScrollView(
    key: const ValueKey('otp'),
    padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
    child: Column(children: [
      // Icon
      Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
            color: _color.withValues(alpha: 0.1), shape: BoxShape.circle),
        child: Icon(Icons.mark_email_read_outlined, size: 40, color: _color),
      ),
      const SizedBox(height: 20),

      Text('Check your email',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
              color: Colors.grey.shade800)),
      const SizedBox(height: 8),
      Text('We sent a 6-digit OTP to',
          style: TextStyle(color: Colors.grey[600], fontSize: 14)),
      const SizedBox(height: 4),
      Text(emailCtrl.text.trim(),
          style: TextStyle(color: _color,
              fontWeight: FontWeight.bold, fontSize: 15)),
      const SizedBox(height: 32),

      // 6 OTP boxes
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(6, (i) => SizedBox(
          width: 46, height: 58,
          child: TextField(
            controller: _otpCtrl[i],
            focusNode: _otpFocus[i],
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            maxLength: 1,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
                color: _color),
            decoration: InputDecoration(
              counterText: '',
              contentPadding: EdgeInsets.zero,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                    color: _otpCtrl[i].text.isNotEmpty
                        ? _color : Colors.grey.shade300,
                    width: 2),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: _color, width: 2.5),
              ),
              filled: true,
              fillColor: _otpCtrl[i].text.isNotEmpty
                  ? _color.withValues(alpha: 0.06) : Colors.grey.shade50,
            ),
            onChanged: (v) => _onOtpDigit(v, i),
          ),
        )),
      ),
      const SizedBox(height: 14),

      // Error
      if (_otpError.isNotEmpty)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade200)),
          child: Row(children: [
            Icon(Icons.error_outline, size: 16, color: Colors.red.shade700),
            const SizedBox(width: 8),
            Expanded(child: Text(_otpError,
                style: TextStyle(color: Colors.red.shade700, fontSize: 13))),
          ]),
        ),
      const SizedBox(height: 28),

      // Verify button
      SizedBox(
        width: double.infinity, height: 52,
        child: ElevatedButton.icon(
          onPressed: _loading ? null : _verifyOtp,
          icon: _loading
              ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
              : const Icon(Icons.verified_outlined),
          label: Text(_loading ? 'Verifying…' : 'Verify & Create Account',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
              backgroundColor: _color, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
        ),
      ),
      const SizedBox(height: 20),

      // Resend
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text("Didn't receive it?  ",
            style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        _resendSecs > 0
            ? Text('Resend in ${_resendSecs}s',
                style: TextStyle(color: Colors.grey[400], fontSize: 13,
                    fontWeight: FontWeight.w500))
            : GestureDetector(
                onTap: _loading ? null : _resend,
                child: Text('Resend OTP',
                    style: TextStyle(color: _color,
                        fontWeight: FontWeight.bold, fontSize: 13))),
      ]),
      const SizedBox(height: 10),
      Text('OTP valid for 10 minutes',
          style: TextStyle(color: Colors.grey[400], fontSize: 12)),
    ]),
  );

  Widget _roleBtn(String value, IconData icon, String label) {
    final sel   = role == value;
    final color = value == 'VENDOR' ? Colors.indigo.shade700 : Colors.blue.shade700;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => role = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
              color: sel ? color : Colors.transparent,
              borderRadius: BorderRadius.circular(9)),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 18, color: sel ? Colors.white : Colors.grey[600]),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                color: sel ? Colors.white : Colors.grey[600])),
          ]),
        ),
      ),
    );
  }
}