class CartItem {
  final int    id;          // Cart Item DB row id — used for delete/update
  final String name;
  final String description;
  final double unitPrice;   // price per single unit — never changes with qty
  final String category;
  int          quantity;
  final String imageLink;
  final int    productId;

  CartItem({
    required this.id,
    required this.name,
    required this.description,
    required this.unitPrice,
    required this.category,
    required this.quantity,
    required this.imageLink,
    required this.productId,
  });

  /// Line total — always computed, never stored
  double get price => unitPrice * quantity;

  factory CartItem.fromJson(Map<String, dynamic> j) {
    final qty = (j['quantity'] ?? 1) as int;

    // The Spring backend stores item.price = product unit price (set once at add-to-cart,
    // never updated when quantity changes via updateCart/addToCart increase).
    // mapItem() sends this as "price" — it is always the per-unit price.
    // So use "price" directly as unitPrice (do NOT divide by qty).
    final unitPrice = (j['price'] ?? 0).toDouble();

    return CartItem(
      id:          j['id']          ?? 0,
      name:        j['name']        ?? '',
      description: j['description'] ?? '',
      unitPrice:   unitPrice,
      category:    j['category']    ?? '',
      quantity:    qty,
      imageLink:   j['imageLink']   ?? '',
      productId:   j['productId']   ?? 0,
    );
  }
}
