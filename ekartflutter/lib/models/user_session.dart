class UserSession {
  final int    id;
  final String name;
  final String email;
  final String token;
  final String role;         // CUSTOMER | VENDOR | ADMIN | DELIVERY_BOY
  final String? vendorCode;
  final String? deliveryBoyCode;

  UserSession({
    required this.id,
    required this.name,
    required this.email,
    required this.token,
    required this.role,
    this.vendorCode,
    this.deliveryBoyCode,
  });

  bool get isCustomer     => role == 'CUSTOMER';
  bool get isVendor       => role == 'VENDOR';
  bool get isAdmin        => role == 'ADMIN';
  bool get isDeliveryBoy  => role == 'DELIVERY_BOY';
}
