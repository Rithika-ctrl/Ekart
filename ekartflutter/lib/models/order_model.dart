class OrderItem {
  final int    id;
  final String name;
  final double price;
  final int    quantity;
  final String imageLink;
  final int?   productId;

  /// True when the vendor who sold this item allows returns/refunds.
  /// FIX: the backend's mapItem() now emits this field (defaults to true
  /// until Product.returnsAccepted column is added).  Previously it was
  /// always missing, so this was always false and the refund button was
  /// permanently hidden.
  final bool returnsAccepted;

  OrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    required this.imageLink,
    this.productId,
    this.returnsAccepted = false,
  });

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        id:              j['id']              ?? 0,
        name:            j['name']            ?? '',
        price:           (j['price']          ?? 0).toDouble(),
        quantity:        j['quantity']        ?? 1,
        imageLink:       j['imageLink']       ?? '',
        productId:       j['productId'],
        returnsAccepted: j['returnsAccepted'] == true,
      );
}

class Order {
  final int        id;
  final double     amount;
  final double     deliveryCharge;
  final double     totalPrice;
  final String     paymentMode;
  final String     deliveryTime;
  final String     trackingStatus;
  final String     trackingStatusDisplay;
  final String?    currentCity;

  /// FIX: deliveryAddress is the immutable destination set at checkout.
  /// currentCity is updated as the order moves (e.g. "On the way — Mumbai").
  /// The backend's mapOrder() now emits both fields separately.
  final String?    deliveryAddress;

  final String?    orderDate;
  final String?    estimatedDelivery;
  final bool       replacementRequested;
  final List<OrderItem> items;

  /// ISO timestamp of when the DELIVERED tracking event was logged.
  /// Used to enforce the 7-day refund / report-issue eligibility window.
  final String? deliveredAt;

  /// Set of productIds the customer has already reviewed for this order.
  final Set<int> reviewedProductIds;

  Order({
    required this.id,
    required this.amount,
    required this.deliveryCharge,
    required this.totalPrice,
    required this.paymentMode,
    required this.deliveryTime,
    required this.trackingStatus,
    required this.trackingStatusDisplay,
    this.currentCity,
    this.deliveryAddress,
    this.orderDate,
    this.estimatedDelivery,
    required this.replacementRequested,
    required this.items,
    this.deliveredAt,
    Set<int>? reviewedProductIds,
  }) : reviewedProductIds = reviewedProductIds ?? const {};

  /// True when at least one item in this order has returnsAccepted = true.
  /// The "Request Refund / Replacement" button is only shown when this is true.
  bool get hasRefundableItems => items.any((i) => i.returnsAccepted);

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        id:                    j['id']                    ?? 0,
        amount:                (j['amount']               ?? 0).toDouble(),
        deliveryCharge:        (j['deliveryCharge']       ?? 0).toDouble(),
        totalPrice:            (j['totalPrice']           ?? 0).toDouble(),
        paymentMode:           j['paymentMode']           ?? '',
        deliveryTime:          j['deliveryTime']          ?? '',
        trackingStatus:        j['trackingStatus']        ?? 'PROCESSING',
        trackingStatusDisplay: j['trackingStatusDisplay'] ?? 'Processing',
        currentCity:           j['currentCity'],
        deliveryAddress:       j['deliveryAddress'],
        orderDate:             j['orderDate'],
        estimatedDelivery:     j['estimatedDelivery'],
        replacementRequested:  j['replacementRequested']  ?? false,
        items: (j['items'] as List? ?? [])
            .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        deliveredAt: j['deliveredAt'],
        reviewedProductIds: Set<int>.from(
            (j['reviewedProductIds'] as List? ?? [])
                .map((e) => e is int ? e : int.tryParse(e.toString()) ?? 0)
                .where((id) => id != 0)),
      );
}