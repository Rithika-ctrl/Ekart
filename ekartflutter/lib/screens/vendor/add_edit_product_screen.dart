import 'package:flutter/material.dart';
import '../../models/product_model.dart';
import '../../services/vendor_service.dart';

class AddEditProductScreen extends StatefulWidget {
  /// Pass null for adding a new product, or a Product to edit.
  final Product? product;
  const AddEditProductScreen({super.key, this.product});

  @override
  State<AddEditProductScreen> createState() => _AddEditProductScreenState();
}

class _AddEditProductScreenState extends State<AddEditProductScreen> {
  bool get isEdit => widget.product != null;

  final _formKey        = GlobalKey<FormState>();
  final nameCtrl        = TextEditingController();
  final descCtrl        = TextEditingController();
  final priceCtrl       = TextEditingController();
  final mrpCtrl         = TextEditingController();
  final discountCtrl    = TextEditingController();
  final stockCtrl       = TextEditingController();
  final categoryCtrl    = TextEditingController();
  final imageLinkCtrl   = TextEditingController();
  final alertThreshCtrl = TextEditingController(text: '10');
  final gstRateCtrl     = TextEditingController();
  final pinInputCtrl    = TextEditingController();

  // ── Return & Refund policy toggle ─────────────────────────────────────────
  bool _returnsAccepted = false;

  // ── Delivery PIN code restriction ─────────────────────────────────────────
  final List<String> _allowedPins = [];
  String? _pinError;

  bool saving = false;

  // ── GST presets (matches website) ─────────────────────────────────────────
  static const List<double> _gstPresets = [0, 5, 12, 18, 28];

  final List<String> _commonCategories = [
    'Electronics', 'Clothing', 'Books', 'Home & Kitchen',
    'Sports', 'Beauty', 'Toys', 'Grocery', 'Furniture', 'Jewellery',
  ];

  // ── PIN code validation (Indian 6-digit) ──────────────────────────────────
  static final _validPinPrefixes = {
    '11','12','13','14','15','16','17','18','19',
    '20','21','22','23','24','25','26','27','28',
    '30','31','32','33','34','36','37','38','39',
    '40','41','42','43','44','45','46','47','48','49',
    '50','51','52','53','56','57','58','59',
    '60','61','62','63','64','65','66','67','68','69',
    '70','71','72','73','74','75','76','77','78','79',
    '80','81','82','83','84','85',
    '90','91','92','93','94','95','96','97','98','99',
  };

  bool _isValidIndianPin(String val) {
    if (!RegExp(r'^\d{6}$').hasMatch(val)) return false;
    return _validPinPrefixes.contains(val.substring(0, 2));
  }

  @override
  void initState() {
    super.initState();
    if (isEdit) {
      final p = widget.product!;
      nameCtrl.text      = p.name;
      descCtrl.text      = p.description;
      priceCtrl.text     = p.price.toString();
      stockCtrl.text     = p.stock.toString();
      categoryCtrl.text  = p.category;
      imageLinkCtrl.text = p.imageLink;
      _returnsAccepted   = p.returnsAccepted;

      // ── MRP / discount pre-fill ──
      if (p.mrp > 0) {
        mrpCtrl.text = p.mrp.toStringAsFixed(p.mrp == p.mrp.roundToDouble() ? 0 : 2);
        if (p.isDiscounted) {
          discountCtrl.text = p.discountPercent.toString();
        }
      }

      // ── Allowed PIN codes pre-fill ──
      if (p.allowedPinCodes != null && p.allowedPinCodes!.trim().isNotEmpty) {
        _allowedPins.addAll(
          p.allowedPinCodes!.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty),
        );
      }
    }
  }

  @override
  void dispose() {
    nameCtrl.dispose();   descCtrl.dispose();    priceCtrl.dispose();
    mrpCtrl.dispose();    discountCtrl.dispose(); stockCtrl.dispose();
    categoryCtrl.dispose(); imageLinkCtrl.dispose(); alertThreshCtrl.dispose();
    gstRateCtrl.dispose(); pinInputCtrl.dispose();
    super.dispose();
  }

  // ── Pricing calculators (mirrors website logic) ───────────────────────────

  void _onMrpChanged(String val) {
    final mrp   = double.tryParse(val) ?? 0;
    final price = double.tryParse(priceCtrl.text) ?? 0;
    if (mrp > 0 && price > 0 && mrp > price) {
      discountCtrl.text = ((mrp - price) / mrp * 100).round().toString();
    } else {
      discountCtrl.text = '';
    }
    setState(() {});
  }

  void _onPriceChanged(String val) {
    final mrp   = double.tryParse(mrpCtrl.text) ?? 0;
    final price = double.tryParse(val) ?? 0;
    if (mrp > 0 && price > 0 && mrp > price) {
      discountCtrl.text = ((mrp - price) / mrp * 100).round().toString();
    } else {
      discountCtrl.text = '';
    }
    setState(() {});
  }

  void _onDiscountChanged(String val) {
    final mrp = double.tryParse(mrpCtrl.text) ?? 0;
    final pct = double.tryParse(val) ?? 0;
    if (mrp > 0 && pct > 0 && pct < 100) {
      priceCtrl.text = (mrp * (1 - pct / 100)).round().toString();
    }
    setState(() {});
  }

  // ── PIN code helpers ──────────────────────────────────────────────────────

  void _addPin(String raw) {
    final val = raw.trim().replaceAll(RegExp(r'\D'), '');
    if (!_isValidIndianPin(val)) {
      setState(() => _pinError = 'Enter a valid Indian 6-digit PIN code');
      return;
    }
    if (_allowedPins.contains(val)) {
      setState(() => _pinError = '$val already added');
      return;
    }
    setState(() {
      _allowedPins.add(val);
      _pinError = null;
    });
    pinInputCtrl.clear();
  }

  void _removePin(String pin) => setState(() => _allowedPins.remove(pin));

  // ── Save ──────────────────────────────────────────────────────────────────

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => saving = true);

    final body = <String, dynamic>{
      'name':                nameCtrl.text.trim(),
      'description':         descCtrl.text.trim(),
      'price':               double.parse(priceCtrl.text.trim()),
      'category':            categoryCtrl.text.trim(),
      'stock':               int.parse(stockCtrl.text.trim()),
      'imageLink':           imageLinkCtrl.text.trim(),
      'stockAlertThreshold': int.tryParse(alertThreshCtrl.text.trim()) ?? 10,
      'returnsAccepted':     _returnsAccepted,
    };

    // Optional fields
    final mrpVal = double.tryParse(mrpCtrl.text.trim()) ?? 0;
    if (mrpVal > 0) body['mrp'] = mrpVal;

    final gstVal = double.tryParse(gstRateCtrl.text.trim());
    if (gstVal != null) body['gstRate'] = gstVal;

    if (_allowedPins.isNotEmpty) {
      body['allowedPinCodes'] = _allowedPins.join(',');
    } else {
      body['allowedPinCodes'] = '';
    }

    final Map<String, dynamic> res = isEdit
        ? await VendorService.updateProduct(widget.product!.id, body)
        : await VendorService.addProduct(body);

    setState(() => saving = false);
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['message'] ??
          (res['success'] == true
              ? isEdit
                  ? 'Product updated!'
                  : 'Product added! Pending admin approval.'
              : 'Operation failed')),
      backgroundColor: res['success'] == true ? Colors.green : Colors.red,
      duration: const Duration(seconds: 3),
    ));

    if (res['success'] == true) {
      Navigator.pop(context, true);
    }
  }

  // ── Preview values ────────────────────────────────────────────────────────

  double get _previewMrp   => double.tryParse(mrpCtrl.text) ?? 0;
  double get _previewPrice => double.tryParse(priceCtrl.text) ?? 0;
  int    get _previewPct   =>
      (_previewMrp > _previewPrice && _previewMrp > 0)
          ? ((_previewMrp - _previewPrice) / _previewMrp * 100).round()
          : 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Product' : 'Add Product',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [

            // ── Preview image ─────────────────────────────────────────────
            if (imageLinkCtrl.text.isNotEmpty)
              Container(
                height: 180,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.grey[200]),
                clipBehavior: Clip.antiAlias,
                child: Image.network(imageLinkCtrl.text, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Center(
                        child: Icon(Icons.broken_image,
                            size: 60, color: Colors.grey[400]))),
              ),

            _field(
              controller: nameCtrl,
              label: 'Product Name',
              icon: Icons.inventory_2_outlined,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),
            const SizedBox(height: 14),

            _field(
              controller: descCtrl,
              label: 'Description',
              icon: Icons.description_outlined,
              maxLines: 3,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Description is required' : null,
            ),
            const SizedBox(height: 14),

            // ── Category with suggestions ─────────────────────────────────
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              TextFormField(
                controller: categoryCtrl,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  prefixIcon: Icon(Icons.category_outlined),
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Category is required' : null,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6, runSpacing: 4,
                children: _commonCategories.map((cat) => ActionChip(
                  label: Text(cat, style: const TextStyle(fontSize: 12)),
                  onPressed: () => setState(() => categoryCtrl.text = cat),
                  backgroundColor:
                      categoryCtrl.text == cat ? Colors.indigo.shade50 : null,
                )).toList(),
              ),
            ]),
            const SizedBox(height: 14),

            // ── MRP / Pricing section ────────────────────────────────────
            _sectionHeader(Icons.sell_outlined, 'Pricing'),
            const SizedBox(height: 10),

            // MRP field
            _field(
              controller: mrpCtrl,
              label: 'M.R.P. / Original Price (₹)',
              icon: Icons.currency_rupee,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              helperText: 'Leave blank if no discount',
              onChanged: _onMrpChanged,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return null;
                if (double.tryParse(v) == null) return 'Invalid number';
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Selling price + discount % row
            Row(children: [
              Expanded(child: _field(
                controller: priceCtrl,
                label: 'Selling Price (₹)',
                icon: Icons.price_check,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: _onPriceChanged,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Required';
                  if (double.tryParse(v) == null) return 'Invalid price';
                  if (double.parse(v) <= 0) return 'Must be > 0';
                  return null;
                },
              )),
              const SizedBox(width: 8),
              // "OR" divider
              Column(children: [
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.indigo.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('OR',
                      style: TextStyle(fontSize: 11, color: Colors.indigo.shade700,
                          fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 8),
              ]),
              const SizedBox(width: 8),
              Expanded(child: _field(
                controller: discountCtrl,
                label: 'Discount %',
                icon: Icons.percent,
                keyboardType: TextInputType.number,
                onChanged: _onDiscountChanged,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return null;
                  final n = int.tryParse(v);
                  if (n == null) return 'Invalid';
                  if (n < 1 || n > 99) return '1–99 only';
                  return null;
                },
              )),
            ]),

            // Pricing preview badge
            if (_previewPrice > 0) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _previewPct > 0
                      ? Colors.green.shade50
                      : Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: _previewPct > 0
                          ? Colors.green.shade200
                          : Colors.indigo.shade100),
                ),
                child: Row(children: [
                  Icon(Icons.local_offer_outlined,
                      size: 16,
                      color: _previewPct > 0
                          ? Colors.green.shade700
                          : Colors.indigo.shade400),
                  const SizedBox(width: 8),
                  if (_previewPct > 0 && _previewMrp > 0) ...[
                    Text('₹${_previewMrp.toStringAsFixed(0)}',
                        style: TextStyle(
                            decoration: TextDecoration.lineThrough,
                            color: Colors.grey.shade500,
                            fontSize: 13)),
                    const SizedBox(width: 6),
                    Text('₹${_previewPrice.toStringAsFixed(0)}',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade800,
                            fontSize: 14)),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                          color: Colors.green.shade600,
                          borderRadius: BorderRadius.circular(4)),
                      child: Text('$_previewPct% OFF',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold)),
                    ),
                  ] else
                    Text('₹${_previewPrice.toStringAsFixed(0)}',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.indigo.shade700,
                            fontSize: 14)),
                ]),
              ),
            ],
            const SizedBox(height: 14),

            // ── Stock ─────────────────────────────────────────────────────
            Row(children: [
              Expanded(child: _field(
                controller: stockCtrl,
                label: 'Stock Qty',
                icon: Icons.warehouse_outlined,
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Required';
                  if (int.tryParse(v) == null) return 'Invalid';
                  if (int.parse(v) < 0) return 'Must be ≥ 0';
                  return null;
                },
              )),
              const SizedBox(width: 12),
              Expanded(child: _field(
                controller: alertThreshCtrl,
                label: 'Alert Threshold',
                icon: Icons.warning_amber_outlined,
                keyboardType: TextInputType.number,
                helperText: 'Alert when stock falls below this',
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return null;
                  if (int.tryParse(v) == null) return 'Invalid number';
                  return null;
                },
              )),
            ]),
            const SizedBox(height: 14),

            _field(
              controller: imageLinkCtrl,
              label: 'Image URL',
              icon: Icons.image_outlined,
              onChanged: (_) => setState(() {}),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Image URL is required' : null,
            ),
            const SizedBox(height: 20),

            // ── GST Rate ─────────────────────────────────────────────────
            _sectionHeader(Icons.receipt_long_outlined, 'GST Rate (%)'),
            const SizedBox(height: 10),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: TextFormField(
                controller: gstRateCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'GST Rate (%)',
                  prefixIcon: Icon(Icons.percent_outlined),
                  border: OutlineInputBorder(),
                  helperText: 'Leave blank — auto-detected from category',
                  helperMaxLines: 2,
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return null;
                  final n = double.tryParse(v);
                  if (n == null || n < 0 || n > 100) return 'Enter 0–100';
                  return null;
                },
              )),
            ]),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6, runSpacing: 4,
              children: _gstPresets.map((rate) {
                final sel = gstRateCtrl.text.trim() == rate.toStringAsFixed(0) ||
                    gstRateCtrl.text.trim() == rate.toString();
                return ChoiceChip(
                  label: Text('${rate.toStringAsFixed(0)}%'),
                  selected: sel,
                  selectedColor: Colors.indigo.shade100,
                  onSelected: (_) =>
                      setState(() => gstRateCtrl.text = rate.toStringAsFixed(0)),
                );
              }).toList(),
            ),
            // Info note
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(children: [
                Icon(Icons.info_outline, size: 13, color: Colors.grey.shade500),
                const SizedBox(width: 5),
                Expanded(child: Text(
                    'Prices shown to customers are GST-inclusive (MRP style). '
                    'Update whenever the government revises the GST slab.',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600))),
              ]),
            ),
            const SizedBox(height: 20),

            // ── Delivery PIN code restriction ─────────────────────────────
            _sectionHeader(Icons.location_on_outlined, 'Delivery PIN Code Restriction'),
            const SizedBox(height: 6),
            Text(
              'Leave blank to allow delivery to all PIN codes. '
              'Add each PIN code one at a time.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 10),

            // PIN tag display
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
                color: Colors.grey.shade50,
              ),
              padding: const EdgeInsets.all(10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (_allowedPins.isNotEmpty) ...[
                  Wrap(
                    spacing: 6, runSpacing: 6,
                    children: _allowedPins.map((pin) => Chip(
                      label: Text(pin,
                          style: const TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      backgroundColor: Colors.amber.shade50,
                      side: BorderSide(color: Colors.amber.shade300),
                      deleteIcon: const Icon(Icons.close, size: 14),
                      onDeleted: () => _removePin(pin),
                    )).toList(),
                  ),
                  const SizedBox(height: 8),
                ],
                // Input row
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: pinInputCtrl,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: InputDecoration(
                        hintText: 'Type 6-digit PIN & press Add',
                        hintStyle: TextStyle(
                            fontSize: 13, color: Colors.grey.shade400),
                        border: InputBorder.none,
                        counterText: '',
                      ),
                      onSubmitted: _addPin,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () {
                      if (pinInputCtrl.text.trim().isNotEmpty) {
                        _addPin(pinInputCtrl.text);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('Add', style: TextStyle(fontSize: 13)),
                  ),
                ]),
              ]),
            ),
            if (_pinError != null)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 4),
                child: Text(_pinError!,
                    style: TextStyle(fontSize: 12, color: Colors.red.shade700)),
              ),
            const SizedBox(height: 20),

            // ── Returns & Refund Policy ────────────────────────────────────
            Container(
              decoration: BoxDecoration(
                color: _returnsAccepted
                    ? Colors.green.shade50
                    : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: _returnsAccepted
                        ? Colors.green.shade300
                        : Colors.grey.shade300),
              ),
              child: Column(children: [
                SwitchListTile(
                  value: _returnsAccepted,
                  onChanged: (v) => setState(() => _returnsAccepted = v),
                  activeThumbColor: Colors.green.shade700,
                  secondary: Icon(
                    _returnsAccepted
                        ? Icons.assignment_return
                        : Icons.block_outlined,
                    color: _returnsAccepted
                        ? Colors.green.shade700
                        : Colors.grey.shade500,
                  ),
                  title: Text(
                    'Accept Returns & Refunds',
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: _returnsAccepted
                            ? Colors.green.shade800
                            : Colors.grey.shade700),
                  ),
                  subtitle: Text(
                    _returnsAccepted
                        ? 'Customers can request refund or replacement within 7 days of delivery'
                        : 'No returns or refunds offered for this product',
                    style: TextStyle(
                        fontSize: 12,
                        color: _returnsAccepted
                            ? Colors.green.shade700
                            : Colors.grey.shade500),
                  ),
                ),
                if (_returnsAccepted)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline,
                            size: 14, color: Colors.green.shade600),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'This information is shown on the product page so customers know '
                            'before they buy. The 7-day return window starts from delivery date.',
                            style: TextStyle(
                                fontSize: 11,
                                color: Colors.green.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),
              ]),
            ),

            const SizedBox(height: 28),

            SizedBox(
              width: double.infinity, height: 52,
              child: ElevatedButton.icon(
                onPressed: saving ? null : _save,
                icon: saving
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Icon(isEdit ? Icons.save : Icons.add_circle_outline),
                label: Text(
                  isEdit ? 'Save Changes' : 'Add Product',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),

            if (!isEdit) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange.shade200)),
                child: Row(children: [
                  Icon(Icons.info_outline,
                      color: Colors.orange.shade700, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(
                    'New products require admin approval before becoming visible to customers.',
                    style: TextStyle(
                        color: Colors.orange.shade800, fontSize: 13),
                  )),
                ]),
              ),
            ],

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  Widget _sectionHeader(IconData icon, String title) {
    return Row(children: [
      Icon(icon, size: 18, color: Colors.indigo.shade700),
      const SizedBox(width: 8),
      Text(title,
          style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Colors.indigo.shade800)),
    ]);
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    String? helperText,
    String? Function(String?)? validator,
    void Function(String)? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      onChanged: onChanged,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: const OutlineInputBorder(),
        helperText: helperText,
        helperMaxLines: 2,
      ),
    );
  }
}