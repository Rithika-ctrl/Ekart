import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Debug screen — helps identify the exact cause of the HTML error.
/// Add this temporarily to LoginScreen to diagnose connection issues.
/// Remove before production.
class DebugScreen extends StatefulWidget {
  const DebugScreen({super.key});

  @override
  State<DebugScreen> createState() => _DebugScreenState();
}

class _DebugScreenState extends State<DebugScreen> {
  final List<_TestResult> results = [];
  bool running = false;

  Future<void> _runTests() async {
    setState(() { results.clear(); running = true; });

    final tests = [
      ('Customer Login URL', ApiConfig.customerLogin, 'POST'),
      ('Products URL', ApiConfig.products, 'GET'),
      ('Categories URL', ApiConfig.categories, 'GET'),
    ];

    for (final (label, url, method) in tests) {
      try {
        http.Response response;
        if (method == 'POST') {
          response = await http.post(Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: '{}',
          ).timeout(const Duration(seconds: 8));
        } else {
          response = await http.get(Uri.parse(url))
              .timeout(const Duration(seconds: 8));
        }

        final body = response.body.trim();
        final isHtml = body.startsWith('<');
        final isJson = body.startsWith('{') || body.startsWith('[');

        setState(() => results.add(_TestResult(
          label: label,
          url: url,
          statusCode: response.statusCode,
          responseType: isHtml ? 'HTML ❌ (server returned error page)' 
              : isJson ? 'JSON ✅' : 'Unknown ⚠️',
          preview: body.length > 200 ? '${body.substring(0, 200)}...' : body,
          ok: isJson,
        )));
      } catch (e) {
        setState(() => results.add(_TestResult(
          label: label,
          url: url,
          statusCode: 0,
          responseType: 'Connection Failed ❌',
          preview: e.toString(),
          ok: false,
        )));
      }
    }
    setState(() => running = false);
  }

  @override
  void initState() {
    super.initState();
    _runTests();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Connection Diagnostics'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _runTests),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.deepPurple.shade50,
            padding: const EdgeInsets.all(12),
            // ignore: prefer_const_constructors, prefer_const_literals_to_create_immutables
            child: Row(children: [
              const Icon(Icons.info_outline, color: Colors.deepPurple),
              const SizedBox(width: 8),
              // ignore: prefer_const_constructors
              Expanded(child: Text(
                'Base URL: ${ApiConfig.base}',
                style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
              )),
            ]),
          ),
          if (running)
            const LinearProgressIndicator(),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: results.length,
              itemBuilder: (_, i) {
                final r = results[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  color: r.ok ? Colors.green.shade50 : Colors.red.shade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: r.ok ? Colors.green : Colors.red),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 4),
                        Text(r.url, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 6),
                        Row(children: [
                          _chip('HTTP ${r.statusCode}', r.statusCode == 200 ? Colors.green : Colors.red),
                          const SizedBox(width: 8),
                          _chip(r.responseType, r.ok ? Colors.green : Colors.red),
                        ]),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            r.preview,
                            style: const TextStyle(color: Colors.green, fontSize: 11, fontFamily: 'monospace'),
                          ),
                        ),
                        if (!r.ok) ...[
                          const SizedBox(height: 10),
                          const Text('💡 Fix:', style: TextStyle(fontWeight: FontWeight.bold)),
                          _fixHint(r),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.15),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color),
    ),
    child: Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
  );

  Widget _fixHint(_TestResult r) {
    String hint;
    if (r.statusCode == 0) {
      hint = '• Backend server is NOT running.\n'
             '• Start your Spring Boot app first.\n'
             '• If using real device, change 192.168.1.103 → your PC\'s IP address in api_config.dart';
    } else if (r.responseType.contains('HTML')) {
      hint = '• The URL returned an HTML page (likely a 404 or Spring Security login page).\n'
             '• Check that @CrossOrigin and @RequestMapping paths are correct.\n'
             '• Verify SecurityConfig allows /api/flutter/** without authentication.';
    } else {
      hint = '• Unexpected response. Check backend logs.';
    }
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Text(hint, style: const TextStyle(fontSize: 12)),
    );
  }
}

class _TestResult {
  final String label, url, responseType, preview;
  final int statusCode;
  final bool ok;
  _TestResult({
    required this.label, required this.url, required this.statusCode,
    required this.responseType, required this.preview, required this.ok,
  });
}
