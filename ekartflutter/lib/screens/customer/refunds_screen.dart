import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../config/api_config.dart';
import '../../services/auth_service.dart';
import '../../services/refund_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// RefundsScreen — mirrors the website's /refunds tab.
// Shows all refund / replacement requests for the logged-in customer,
// with status badges, reason text, and inline evidence photo upload (up to 5).
// ─────────────────────────────────────────────────────────────────────────────

class RefundsScreen extends StatefulWidget {
  const RefundsScreen({super.key});

  @override
  State<RefundsScreen> createState() => _RefundsScreenState();
}

class _RefundsScreenState extends State<RefundsScreen> {
  List<Map<String, dynamic>> _refunds = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    final res = await RefundService.getMyRefunds();
    if (!mounted) return;
    if (res['success'] == true) {
      setState(() {
        _refunds = List<Map<String, dynamic>>.from(res['refunds'] ?? []);
        _loading = false;
      });
    } else {
      setState(() {
        _error   = res['message'] ?? 'Failed to load refunds';
        _loading = false;
      });
    }
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED': return Colors.green;
      case 'REJECTED': return Colors.red;
      default:         return Colors.amber.shade700;
    }
  }

  IconData _statusIcon(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED': return Icons.check_circle_outline;
      case 'REJECTED': return Icons.cancel_outlined;
      default:         return Icons.hourglass_top_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Refunds & Replacements'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : _refunds.isEmpty
                  ? _buildEmpty()
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _refunds.length,
                        itemBuilder: (_, i) => _RefundCard(
                          refund: _refunds[i],
                          statusColor: _statusColor,
                          statusIcon:  _statusIcon,
                        ),
                      ),
                    ),
    );
  }

  Widget _buildError() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.error_outline, size: 56, color: Colors.red.shade300),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _load, child: const Text('Retry')),
          ]),
        ),
      );

  Widget _buildEmpty() => Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.assignment_return_outlined, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('No refund or replacement requests yet',
              style: TextStyle(fontSize: 16, color: Colors.grey[500])),
          const SizedBox(height: 8),
          Text('Requests you submit from your orders will appear here.',
              style: TextStyle(fontSize: 13, color: Colors.grey[400]),
              textAlign: TextAlign.center),
        ]),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual refund card with lazy-loaded images + upload
// ─────────────────────────────────────────────────────────────────────────────

class _RefundCard extends StatefulWidget {
  final Map<String, dynamic>                 refund;
  final Color Function(String)               statusColor;
  final IconData Function(String)            statusIcon;

  const _RefundCard({
    required this.refund,
    required this.statusColor,
    required this.statusIcon,
  });

  @override
  State<_RefundCard> createState() => _RefundCardState();
}

class _RefundCardState extends State<_RefundCard> {
  List<String>? _images;          // null = not loaded yet
  bool   _loadingImages = false;

  final List<XFile>  _pickedFiles = [];
  bool   _uploading  = false;
  String _uploadMsg  = '';

  Map<String, dynamic> get r => widget.refund;

  int?    get _refundId => r['refundId'] as int?;
  String  get _status   => (r['status'] as String? ?? 'PENDING').toUpperCase();
  String  get _type     => r['type'] as String? ?? '';
  String  get _reason   => r['reason'] as String? ?? '';
  String  get _orderId  => '${r['orderId'] ?? '—'}';
  String? get _date     => r['orderDate'] as String?;
  double  get _amount   => (r['amount'] ?? r['totalPrice'] ?? 0).toDouble();
  String? get _adminNote => r['adminNote'] as String?;

  int get _slotsLeft => 5 - (_images?.length ?? 0);

  @override
  Widget build(BuildContext context) {
    final sc = widget.statusColor(_status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          onExpansionChanged: (open) {
            if (open && _images == null && _refundId != null) _loadImages();
          },
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: CircleAvatar(
            backgroundColor: sc.withValues(alpha: 0.12),
            child: Icon(widget.statusIcon(_status), color: sc, size: 20),
          ),
          title: Text('Order #$_orderId',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Status badge
            const SizedBox(height: 4),
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                    color: sc.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sc.withValues(alpha: 0.35))),
                child: Text(_status,
                    style: TextStyle(
                        color: sc, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 8),
              if (_type.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.blue.shade200)),
                  child: Text(
                    _type.replaceAll('[', '').replaceAll(']', '').trim(),
                    style: TextStyle(
                        color: Colors.blue.shade700,
                        fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
            ]),
            const SizedBox(height: 4),
            if (_date != null)
              Text(_formatDate(_date!),
                  style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ]),
          trailing: _amount > 0
              ? Text('₹${_amount.toStringAsFixed(0)}',
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.blue.shade700))
              : null,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                // Reason
                if (_reason.isNotEmpty) ...[
                  const Text('Reason',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade200)),
                    child: Text(_reason,
                        style: TextStyle(color: Colors.grey[700], fontSize: 13)),
                  ),
                  const SizedBox(height: 12),
                ],

                // Admin note (shown if present)
                if (_adminNote != null && _adminNote!.trim().isNotEmpty) ...[
                  const Text('Admin Response',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                        color: _status == 'APPROVED'
                            ? Colors.green.shade50
                            : _status == 'REJECTED'
                                ? Colors.red.shade50
                                : Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: _status == 'APPROVED'
                                ? Colors.green.shade200
                                : _status == 'REJECTED'
                                    ? Colors.red.shade200
                                    : Colors.blue.shade200)),
                    child: Text(_adminNote!,
                        style: TextStyle(fontSize: 13, color: Colors.grey[700])),
                  ),
                  const SizedBox(height: 12),
                ],

                // ── Evidence Photos ──────────────────────────────────────────
                Row(children: [
                  const Text('Evidence Photos',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const Spacer(),
                  if (_images != null)
                    Text('${_images!.length}/5',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ]),
                const SizedBox(height: 8),

                // Existing images
                if (_loadingImages)
                  const Center(child: CircularProgressIndicator(strokeWidth: 2))
                else if (_images == null)
                  Text('Tap to load photos',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12))
                else if (_images!.isEmpty)
                  Text('No photos uploaded yet',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12))
                else
                  SizedBox(
                    height: 80,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _images!.length,
                      itemBuilder: (_, i) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            _images![i],
                            width: 80, height: 80, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                                width: 80, height: 80,
                                color: Colors.grey[200],
                                child: const Icon(Icons.broken_image,
                                    color: Colors.grey)),
                          ),
                        ),
                      ),
                    ),
                  ),

                // Upload section — only when PENDING and slots available
                if (_status == 'PENDING' && _refundId != null && _slotsLeft > 0) ...[
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 4),

                  // Picked file previews
                  if (_pickedFiles.isNotEmpty) ...[
                    SizedBox(
                      height: 70,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _pickedFiles.length,
                        itemBuilder: (_, i) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Stack(children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(
                                File(_pickedFiles[i].path),
                                width: 70, height: 70, fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 2, right: 2,
                              child: GestureDetector(
                                onTap: () => setState(() => _pickedFiles.removeAt(i)),
                                child: Container(
                                  decoration: const BoxDecoration(
                                      color: Colors.black54,
                                      shape: BoxShape.circle),
                                  child: const Icon(Icons.close,
                                      size: 14, color: Colors.white),
                                ),
                              ),
                            ),
                          ]),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],

                  Row(children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _uploading ? null : _pickImages,
                        icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                        label: Text('Add Photos (${_pickedFiles.length}/$_slotsLeft)'),
                        style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.blue.shade300),
                            foregroundColor: Colors.blue.shade700),
                      ),
                    ),
                    if (_pickedFiles.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: _uploading ? null : _uploadImages,
                        icon: _uploading
                            ? const SizedBox(width: 14, height: 14,
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.upload, size: 16),
                        label: Text(_uploading ? 'Uploading…' : 'Upload'),
                        style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade700,
                            foregroundColor: Colors.white),
                      ),
                    ],
                  ]),

                  if (_uploadMsg.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(_uploadMsg,
                        style: TextStyle(
                            fontSize: 12,
                            color: _uploadMsg.startsWith('✓')
                                ? Colors.green.shade700
                                : Colors.red.shade700)),
                  ],
                ],
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadImages() async {
    if (_refundId == null) return;
    setState(() => _loadingImages = true);
    final res = await RefundService.getRefundImages(_refundId!);
    if (!mounted) return;
    setState(() {
      _images        = List<String>.from(res['images'] ?? []);
      _loadingImages = false;
    });
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 75);
    if (!mounted) return;
    final canAdd = _slotsLeft - _pickedFiles.length;
    if (canAdd <= 0) return;
    setState(() {
      _pickedFiles.addAll(picked.take(canAdd));
      _uploadMsg = '';
    });
  }

  Future<void> _uploadImages() async {
    if (_pickedFiles.isEmpty || _refundId == null) return;
    setState(() { _uploading = true; _uploadMsg = ''; });

    final headers = {
      'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
    };

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.refundUploadImage(_refundId!)),
      )..headers.addAll(headers);

      for (final f in _pickedFiles) {
        request.files.add(await http.MultipartFile.fromPath('images', f.path));
      }

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      final body     = response.body.trim();

      if (response.statusCode == 200 && !body.startsWith('<')) {
        final d = jsonDecodeMap(body);
        if (d['success'] == true) {
          final count = d['uploaded'] ?? _pickedFiles.length;
          setState(() {
            _uploadMsg = '✓ $count photo${count != 1 ? 's' : ''} uploaded';
            _pickedFiles.clear();
          });
          await _loadImages(); // refresh the gallery
        } else {
          setState(() => _uploadMsg = '✗ ${d['message'] ?? 'Upload failed'}');
        }
      } else {
        setState(() => _uploadMsg = '✗ Upload failed (HTTP ${response.statusCode})');
      }
    } catch (e) {
      if (mounted) setState(() => _uploadMsg = '✗ Upload error: $e');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  static Map<String, dynamic> jsonDecodeMap(String s) {
    try {
      return json.decode(s) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  String _formatDate(String raw) {
    try {
      final dt = DateTime.parse(raw);
      const m = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${dt.day} ${m[dt.month]} ${dt.year}';
    } catch (_) {
      return raw;
    }
  }
}