/// Product model — mirrors the Spring Boot Product DTO.
///
/// Fields:
///   - allowedPinCodes  : comma-separated list of Indian PIN codes the vendor
///                        has restricted delivery to. Null/blank = no restriction.
///   - returnsAccepted  : true when the vendor explicitly allows returns/refunds
///                        for this product. Customers can only request a refund
///                        or replacement if this is true.
class Product {
  final int    id;
  final String name;
  final String description;
  final double price;
  final double mrp;
  final String category;
  final int    stock;
  final String imageLink;
  final List<String> extraImages;
  final bool   approved;
  final String? vendorCode;
  final String? allowedPinCodes;

  // ── Return & Refund policy (NEW) ───────────────────────────────────────────
  /// True when the selling vendor allows returns and refunds for this product.
  /// When false the customer cannot request a refund or replacement after
  /// delivery — the option is hidden in the orders screen.
  final bool returnsAccepted;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.mrp,
    required this.category,
    required this.stock,
    required this.imageLink,
    required this.extraImages,
    required this.approved,
    this.vendorCode,
    this.allowedPinCodes,
    this.returnsAccepted = false,
  });

  bool get isDiscounted => mrp > 0 && mrp > price;
  int  get discountPercent =>
      isDiscounted ? ((mrp - price) / mrp * 100).round() : 0;

  bool get isRestrictedByPinCode =>
      allowedPinCodes != null && allowedPinCodes!.trim().isNotEmpty;

  List<String> get allowedPinCodeList {
    if (!isRestrictedByPinCode) return [];
    return allowedPinCodes!
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
  }

  bool isDeliverableTo(String? pinCode) {
    if (!isRestrictedByPinCode) return true;
    if (pinCode == null || pinCode.trim().isEmpty) return false;
    return allowedPinCodeList.contains(pinCode.trim());
  }

  factory Product.fromJson(Map<String, dynamic> j) {
    List<String> extras = [];
    final raw = j['extraImageLinks'];
    if (raw != null && raw.toString().isNotEmpty) {
      extras = raw.toString().split(',').where((s) => s.trim().isNotEmpty).toList();
    }
    return Product(
      id:              j['id']              ?? 0,
      name:            j['name']            ?? '',
      description:     j['description']     ?? '',
      price:           (j['price']          ?? 0).toDouble(),
      mrp:             (j['mrp']            ?? 0).toDouble(),
      category:        j['category']        ?? '',
      stock:           j['stock']           ?? 0,
      imageLink:       j['imageLink']       ?? '',
      extraImages:     extras,
      approved:        j['approved']        ?? false,
      vendorCode:      j['vendorCode'],
      allowedPinCodes: j['allowedPinCodes'] as String?,
      returnsAccepted: j['returnsAccepted'] == true,
    );
  }
}
