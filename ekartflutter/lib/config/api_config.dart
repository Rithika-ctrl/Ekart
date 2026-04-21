// class ApiConfig {
//   // ── Change to your machine IP (10.0.2.2 for Android emulator) ──────────────
//   static const String base       = 'http://192.168.1.103:8080/api/flutter';
//   static const String searchBase = 'http://192.168.1.103:8080/api/search';
//   static const String webBase    = 'http://192.168.1.103:8080';

//   // ── Auth ───────────────────────────────────────────────────────────────────
//   static const String customerLogin       = '$base/auth/customer/login';
//   static const String customerRegister    = '$base/auth/customer/register';
//   static const String customerSendOtp     = '$base/auth/customer/send-otp';
//   static const String customerVerifyOtp   = '$base/auth/customer/verify-otp';
//   static const String vendorLogin      = '$base/auth/vendor/login';
//   static const String vendorRegister   = '$base/auth/vendor/register';
//   static const String adminLogin       = '$base/auth/admin/login';

//   // FIX 1: deliveryRegister was pointing to the Thymeleaf web-form URL
//   // (/delivery/register) which returns HTML. Changed to the JSON API endpoint.
//   static const String deliveryRegister = '$base/auth/delivery/register';
//   static const String deliveryLogin    = '$base/auth/delivery/login';
//   static const String deliveryLogout   = '$webBase/delivery/logout';

//   // ── Products ───────────────────────────────────────────────────────────────
//   static const String products   = '$base/products';
//   static const String categories = '$base/products/categories';
//   static String productById(int id)    => '$base/products/$id';
//   static String productReviews(int id) => '$base/products/$id/reviews';
//   static const String addReview        = '$base/reviews/add';

//   // ── Banners ────────────────────────────────────────────────────────────────
//   static const String banners = '$base/banners';

//   // ── Search ─────────────────────────────────────────────────────────────────
//   static const String searchSuggestions = '$searchBase/suggestions';
//   static const String searchFuzzy       = '$searchBase/fuzzy';

//   // ── Back-in-stock ──────────────────────────────────────────────────────────
//   static String notifyMe(int productId)       => '$base/notify-me/$productId';
//   static String notifyMeStatus(int productId) => '$base/notify-me/$productId';

//   // ── Cart ───────────────────────────────────────────────────────────────────
//   static const String cart       = '$base/cart';
//   static const String cartAdd    = '$base/cart/add';
//   static const String cartUpdate = '$base/cart/update';
//   static String cartRemove(int productId) => '$base/cart/remove/$productId';

//   // ── Orders ─────────────────────────────────────────────────────────────────
//   static const String orders     = '$base/orders';
//   static const String placeOrder = '$base/orders/place';
//   static String orderById(int id)            => '$base/orders/$id';
//   static String cancelOrder(int id)          => '$base/orders/$id/cancel';
//   static String reorder(int id)              => '$base/orders/$id/reorder';
//   static String requestReplacement(int id)   => '$webBase/request-replacement/$id';

//   // ── Refunds ────────────────────────────────────────────────────────────────
//   static const String refundRequest  = '$base/refund/request';
//   static String refundStatus(int id) => '$base/refund/status/$id';

//   // ── Wishlist ───────────────────────────────────────────────────────────────
//   static const String wishlist       = '$base/wishlist';
//   static const String wishlistIds    = '$base/wishlist/ids';
//   static const String wishlistToggle = '$base/wishlist/toggle';

//   // ── Profile ────────────────────────────────────────────────────────────────
//   static const String profile        = '$base/profile';
//   static const String profileUpdate  = '$base/profile/update';
//   static const String addAddress     = '$base/profile/address/add';
//   static const String changePassword = '$base/profile/change-password';
//   static String deleteAddress(int id) => '$base/profile/address/$id/delete';

//   // ── Spending ───────────────────────────────────────────────────────────────
//   static const String spendingSummary = '$base/spending-summary';

//   // ── Coupons ────────────────────────────────────────────────────────────────
//   static const String activeCoupons   = '$base/coupons';
//   // FIX 2: validateCoupon and useCoupon were pointing to old web-session
//   // endpoints (/api/coupon/validate and /api/coupon/use) that don't exist in
//   // the Flutter API and return HTML.  Both operations are handled by a single
//   // POST to /api/flutter/cart/coupon (apply) or DELETE for removal.
//   static const String cartCoupon      = '$base/cart/coupon';
//   // Kept for backward compatibility — both now point to the same Flutter endpoint.
//   static const String validateCoupon  = '$base/cart/coupon';
//   static const String useCoupon       = '$base/cart/coupon';

//   // ── Order Tracking & Dispute ───────────────────────────────────────────────
//   static String trackOrder(int id)       => '$base/orders/$id/track';
//   static String reportIssue(int id)      => '$base/orders/$id/report-issue';

//   // ── Share ──────────────────────────────────────────────────────────────────
//   static String productWebUrl(int productId) => '$webBase/product/$productId';

//   // ── Vendor ─────────────────────────────────────────────────────────────────
//   static const String vendorProducts      = '$base/vendor/products';
//   static const String vendorOrders        = '$base/vendor/orders';
//   static const String vendorStats         = '$base/vendor/stats';
//   static const String vendorAddProduct    = '$base/vendor/products/add';
//   static const String vendorSalesReport   = '$base/vendor/sales-report';
//   static const String vendorProfile       = '$base/vendor/profile';
//   static const String vendorProfileUpdate = '$base/vendor/profile/update';
//   static const String vendorStockAlerts   = '$base/vendor/stock-alerts';
//   static String vendorUpdateProduct(int id) => '$base/vendor/products/$id/update';
//   static String vendorDeleteProduct(int id) => '$base/vendor/products/$id/delete';
//   static String acknowledgeAlert(int id)    => '$base/vendor/stock-alerts/$id/acknowledge';
//   static String vendorMarkOrderReady(int orderId) =>
//       '$base/vendor/orders/$orderId/mark-ready';

//   // ── Admin ──────────────────────────────────────────────────────────────────
//   static const String adminUsers    = '$base/admin/users';
//   static const String adminProducts = '$base/admin/products';
//   static const String adminOrders   = '$base/admin/orders';
//   static const String adminVendors  = '$base/admin/vendors';
//   static String adminToggleCustomer(int id)  => '$base/admin/customers/$id/toggle-active';
//   static String adminToggleVendor(int id)    => '$base/admin/vendors/$id/toggle-active';
//   static String adminApproveProduct(int id)  => '$base/admin/products/$id/approve';
//   static String adminRejectProduct(int id)   => '$base/admin/products/$id/reject';
//   static String adminOrderStatus(int id)     => '$base/admin/orders/$id/status';

//   // Admin: Coupons
//   static const String adminCoupons       = '$base/admin/coupons';
//   static const String adminCreateCoupon  = '$base/admin/coupons/create';
//   static String adminToggleCoupon(int id) => '$base/admin/coupons/toggle/$id';
//   static String adminDeleteCoupon(int id) => '$base/admin/coupons/delete/$id';

//   // Admin: Refunds
//   static const String adminRefunds         = '$base/admin/refunds';
//   static String adminProcessRefund(int orderId) => '$base/admin/refunds/$orderId/process';

//   // Admin: Delivery management
//   static const String adminDeliveryData     = '$base/admin/delivery/data';
//   static const String adminApproveDelivery  = '$base/admin/delivery/boy/approve';
//   static const String adminRejectDelivery   = '$base/admin/delivery/boy/reject';
//   static const String adminAssignDelivery   = '$base/admin/delivery/assign';
//   static String adminDeliveryBoysForOrder(int orderId) => '$base/admin/delivery/data';

//   // Admin: Products bulk
//   static const String adminApproveAll = '$base/admin/products/approve-all';

//   // ── Delivery Boy ───────────────────────────────────────────────────────────
//   static const String deliveryHome          = '$base/delivery/home';
//   static const String deliveryWarehouses    = '$base/delivery/warehouses';
//   static String deliveryPickup(int orderId)   => '$base/delivery/order/$orderId/pickup';
//   static const String deliveryAvailabilityToggle = '$base/delivery/availability/toggle';
//   static const String deliveryCodConfirm         = '$base/delivery/confirm';
//   static String deliveryResendOtp(int orderId)   => '$base/delivery/order/$orderId/resend-otp';
//   static String deliveryDeliver(int orderId)  => '$base/delivery/order/$orderId/deliver';
//   static const String deliveryWarehouseChangeRequest =
//       '$base/delivery/warehouse-change/request';

//   // ── Geocoding / Location ───────────────────────────────────────────────────
//   static const String geocodeAuto   = '$webBase/api/geocode/auto';
//   static const String geocodePin    = '$webBase/api/geocode/pin';
//   static const String geocodeByCity = '$webBase/api/geocode/by-city';
//   static String checkPinCode(String pin) => '$webBase/api/check-pincode?pinCode=$pin';

//   // ── Razorpay Online Payment ────────────────────────────────────────────────
//   static const String razorpayCheckout   = '$base/orders/razorpay/checkout';
//   static const String razorpayCallback   = '$base/orders/razorpay/callback';
//   static const String razorpayPlaceOrder = '$base/orders/razorpay/place';

//   // ── GST / Tax ──────────────────────────────────────────────────────────────
//   static const String cartGst = '$base/cart/gst';

//   // ── Invoice PDF Download ───────────────────────────────────────────────────
//   static String invoiceDownload(int orderId) => '$webBase/customer/invoice/$orderId';

//   // ── User Activity Tracking ─────────────────────────────────────────────────
//   static const String userActivityBatch = '$base/user-activity/batch';

//   // ── Reorder Stock Pre-Check ────────────────────────────────────────────────
//   static String reorderStockCheck(int orderId) => '$base/orders/$orderId/reorder/check';

//   // ── Customer Refunds Page ──────────────────────────────────────────────────
//   static const String myRefunds = '$base/my-refunds';
//   static String refundUploadImage(int refundId) => '$base/refund/$refundId/upload-image';
//   static String refundImages(int refundId)      => '$base/refund/$refundId/images';
// }


// class ApiConfig {
//   // ── Change to your machine IP (10.0.2.2 for Android emulator) ──────────────
//   static const String base       = 'http://192.168.1.103:8080/api/flutter';
//   static const String searchBase = 'http://192.168.1.103:8080/api/search';
//   static const String webBase    = 'http://192.168.1.103:8080';

//   // ── Auth ───────────────────────────────────────────────────────────────────
//   static const String customerLogin       = '$base/auth/customer/login';
//   static const String customerRegister    = '$base/auth/customer/register';
//   static const String customerSendOtp     = '$base/auth/customer/send-otp';
//   static const String customerVerifyOtp   = '$base/auth/customer/verify-otp';
//   static const String vendorLogin      = '$base/auth/vendor/login';
//   static const String vendorRegister   = '$base/auth/vendor/register';
//   static const String adminLogin       = '$base/auth/admin/login';

//   // FIX 1: deliveryRegister was pointing to the Thymeleaf web-form URL
//   // (/delivery/register) which returns HTML. Changed to the JSON API endpoint.
//   static const String deliveryRegister = '$base/auth/delivery/register';
//   static const String deliveryLogin    = '$base/auth/delivery/login';
//   static const String deliveryLogout   = '$webBase/delivery/logout';

//   // ── Products ───────────────────────────────────────────────────────────────
//   static const String products   = '$base/products';
//   static const String categories = '$base/products/categories';
//   static String productById(int id)    => '$base/products/$id';
//   static String productReviews(int id) => '$base/products/$id/reviews';
//   static const String addReview        = '$base/reviews/add';

//   // ── Banners ────────────────────────────────────────────────────────────────
//   static const String banners = '$base/banners';

//   // ── Search ─────────────────────────────────────────────────────────────────
//   static const String searchSuggestions = '$searchBase/suggestions';
//   static const String searchFuzzy       = '$searchBase/fuzzy';

//   // ── Back-in-stock ──────────────────────────────────────────────────────────
//   static String notifyMe(int productId)       => '$base/notify-me/$productId';
//   static String notifyMeStatus(int productId) => '$base/notify-me/$productId';

//   // ── Cart ───────────────────────────────────────────────────────────────────
//   static const String cart       = '$base/cart';
//   static const String cartAdd    = '$base/cart/add';
//   static const String cartUpdate = '$base/cart/update';
//   static String cartRemove(int productId) => '$base/cart/remove/$productId';

//   // ── Orders ─────────────────────────────────────────────────────────────────
//   static const String orders     = '$base/orders';
//   static const String placeOrder = '$base/orders/place';
//   static String orderById(int id)            => '$base/orders/$id';
//   static String cancelOrder(int id)          => '$base/orders/$id/cancel';
//   static String reorder(int id)              => '$base/orders/$id/reorder';
//   static String requestReplacement(int id)   => '$webBase/request-replacement/$id';

//   // ── Refunds ────────────────────────────────────────────────────────────────
//   static const String refundRequest  = '$base/refund/request';
//   static String refundStatus(int id) => '$base/refund/status/$id';

//   // ── Wishlist ───────────────────────────────────────────────────────────────
//   static const String wishlist       = '$base/wishlist';
//   static const String wishlistIds    = '$base/wishlist/ids';
//   static const String wishlistToggle = '$base/wishlist/toggle';

//   // ── Profile ────────────────────────────────────────────────────────────────
//   static const String profile        = '$base/profile';
//   static const String profileUpdate  = '$base/profile/update';
//   static const String addAddress     = '$base/profile/address/add';
//   static const String changePassword = '$base/profile/change-password';
//   static String deleteAddress(int id) => '$base/profile/address/$id/delete';

//   // ── Spending ───────────────────────────────────────────────────────────────
//   static const String spendingSummary = '$base/spending-summary';

//   // ── Coupons ────────────────────────────────────────────────────────────────
//   static const String activeCoupons   = '$base/coupons';
//   // FIX 2: validateCoupon and useCoupon were pointing to old web-session
//   // endpoints (/api/coupon/validate and /api/coupon/use) that don't exist in
//   // the Flutter API and return HTML.  Both operations are handled by a single
//   // POST to /api/flutter/cart/coupon (apply) or DELETE for removal.
//   static const String cartCoupon      = '$base/cart/coupon';
//   // Kept for backward compatibility — both now point to the same Flutter endpoint.
//   static const String validateCoupon  = '$base/cart/coupon';
//   static const String useCoupon       = '$base/cart/coupon';

//   // ── Order Tracking & Dispute ───────────────────────────────────────────────
//   static String trackOrder(int id)       => '$base/orders/$id/track';
//   static String reportIssue(int id)      => '$base/orders/$id/report-issue';

//   // ── Share ──────────────────────────────────────────────────────────────────
//   static String productWebUrl(int productId) => '$webBase/product/$productId';

//   // ── Vendor ─────────────────────────────────────────────────────────────────
//   static const String vendorProducts      = '$base/vendor/products';
//   static const String vendorOrders        = '$base/vendor/orders';
//   static const String vendorStats         = '$base/vendor/stats';
//   static const String vendorAddProduct    = '$base/vendor/products/add';
//   static const String vendorSalesReport   = '$base/vendor/sales-report';
//   static const String vendorProfile       = '$base/vendor/profile';
//   static const String vendorProfileUpdate = '$base/vendor/profile/update';
//   static const String vendorStockAlerts   = '$base/vendor/stock-alerts';
//   static String vendorUpdateProduct(int id) => '$base/vendor/products/$id/update';
//   static String vendorDeleteProduct(int id) => '$base/vendor/products/$id/delete';
//   static String acknowledgeAlert(int id)    => '$base/vendor/stock-alerts/$id/acknowledge';
//   static String vendorMarkOrderReady(int orderId) =>
//       '$base/vendor/orders/$orderId/mark-ready';

//   // ── Admin ──────────────────────────────────────────────────────────────────
//   static const String adminUsers    = '$base/admin/users';
//   static const String adminProducts = '$base/admin/products';
//   static const String adminOrders   = '$base/admin/orders';
//   static const String adminVendors  = '$base/admin/vendors';
//   static String adminToggleCustomer(int id)  => '$base/admin/customers/$id/toggle-active';
//   static String adminToggleVendor(int id)    => '$base/admin/vendors/$id/toggle-active';
//   static String adminApproveProduct(int id)  => '$base/admin/products/$id/approve';
//   static String adminRejectProduct(int id)   => '$base/admin/products/$id/reject';
//   static String adminOrderStatus(int id)     => '$base/admin/orders/$id/status';

//   // Admin: Coupons
//   static const String adminCoupons       = '$base/admin/coupons';
//   static const String adminCreateCoupon  = '$base/admin/coupons/create';
//   static String adminToggleCoupon(int id) => '$base/admin/coupons/toggle/$id';
//   static String adminDeleteCoupon(int id) => '$base/admin/coupons/delete/$id';

//   // Admin: Refunds
//   static const String adminRefunds         = '$base/admin/refunds';
//   static String adminProcessRefund(int orderId) => '$base/admin/refunds/$orderId/process';

//   // Admin: Delivery management
//   static const String adminDeliveryData     = '$base/admin/delivery/data';
//   static const String adminApproveDelivery  = '$base/admin/delivery/boy/approve';
//   static const String adminRejectDelivery   = '$base/admin/delivery/boy/reject';
//   static const String adminAssignDelivery   = '$base/admin/delivery/assign';
//   static String adminDeliveryBoysForOrder(int orderId) => '$base/admin/delivery/data';

//   // Admin: Products bulk
//   static const String adminApproveAll = '$base/admin/products/approve-all';

//   // ── Delivery Boy ───────────────────────────────────────────────────────────
//   static const String deliveryHome          = '$base/delivery/home';
//   static const String deliveryWarehouses    = '$base/delivery/warehouses';
//   static String deliveryPickup(int orderId)   => '$base/delivery/order/$orderId/pickup';
//   static String deliveryDeliver(int orderId)  => '$base/delivery/order/$orderId/deliver';
//   static const String deliveryWarehouseChangeRequest =
//       '$base/delivery/warehouse-change/request';

//   // ── Geocoding / Location ───────────────────────────────────────────────────
//   static const String geocodeAuto   = '$webBase/api/geocode/auto';
//   static const String geocodePin    = '$webBase/api/geocode/pin';
//   static const String geocodeByCity = '$webBase/api/geocode/by-city';
//   static String checkPinCode(String pin) => '$webBase/api/check-pincode?pinCode=$pin';

//   // ── Razorpay Online Payment ────────────────────────────────────────────────
//   static const String razorpayCheckout   = '$base/orders/razorpay/checkout';
//   static const String razorpayCallback   = '$base/orders/razorpay/callback';
//   static const String razorpayPlaceOrder = '$base/orders/razorpay/place';

//   // ── GST / Tax ──────────────────────────────────────────────────────────────
//   static const String cartGst = '$base/cart/gst';

//   // ── Invoice PDF Download ───────────────────────────────────────────────────
//   static String invoiceDownload(int orderId) => '$webBase/customer/invoice/$orderId';

//   // ── User Activity Tracking ─────────────────────────────────────────────────
//   static const String userActivityBatch = '$base/user-activity/batch';

//   // ── Reorder Stock Pre-Check ────────────────────────────────────────────────
//   static String reorderStockCheck(int orderId) => '$base/orders/$orderId/reorder/check';

//   // ── Customer Refunds Page ──────────────────────────────────────────────────
//   static const String myRefunds = '$base/my-refunds';
//   static String refundUploadImage(int refundId) => '$base/refund/$refundId/upload-image';
//   static String refundImages(int refundId)      => '$base/refund/$refundId/images';
// }


class ApiConfig {
  // ── Change to your machine IP (10.0.2.2 for Android emulator) ──────────────
  static const String base       = 'http://192.168.1.103:8080/api/flutter';
  static const String searchBase = 'http://192.168.1.103:8080/api/search';
  static const String webBase    = 'http://192.168.1.103:8080';

  // ── Auth ───────────────────────────────────────────────────────────────────
  static const String customerLogin       = '$base/auth/customer/login';
  static const String customerRegister    = '$base/auth/customer/register';
  static const String customerSendOtp     = '$base/auth/customer/send-otp';
  static const String customerVerifyOtp   = '$base/auth/customer/verify-otp';
  static const String vendorLogin      = '$base/auth/vendor/login';
  static const String vendorRegister   = '$base/auth/vendor/register';
  static const String adminLogin       = '$base/auth/admin/login';

  // FIX 1: deliveryRegister was pointing to the Thymeleaf web-form URL
  // (/delivery/register) which returns HTML. Changed to the JSON API endpoint.
  static const String deliveryRegister = '$base/auth/delivery/register';
  static const String deliveryLogin    = '$base/auth/delivery/login';
  static const String deliveryLogout   = '$webBase/delivery/logout';

  // ── Products ───────────────────────────────────────────────────────────────
  static const String products   = '$base/products';
  static const String categories = '$base/products/categories';
  static String productById(int id)    => '$base/products/$id';
  static String productReviews(int id) => '$base/products/$id/reviews';
  static const String addReview        = '$base/reviews/add';

  // ── Banners ────────────────────────────────────────────────────────────────
  static const String banners = '$base/banners';

  // ── Search ─────────────────────────────────────────────────────────────────
  static const String searchSuggestions = '$searchBase/suggestions';
  static const String searchFuzzy       = '$searchBase/fuzzy';

  // ── Back-in-stock ──────────────────────────────────────────────────────────
  static String notifyMe(int productId)       => '$base/notify-me/$productId';
  static String notifyMeStatus(int productId) => '$base/notify-me/$productId';

  // ── Cart ───────────────────────────────────────────────────────────────────
  static const String cart       = '$base/cart';
  static const String cartAdd    = '$base/cart/add';
  static const String cartUpdate = '$base/cart/update';
  static String cartRemove(int productId) => '$base/cart/remove/$productId';

  // ── Orders ─────────────────────────────────────────────────────────────────
  static const String orders     = '$base/orders';
  static const String placeOrder = '$base/orders/place';
  static String orderById(int id)            => '$base/orders/$id';
  static String cancelOrder(int id)          => '$base/orders/$id/cancel';
  static String reorder(int id)              => '$base/orders/$id/reorder';
  static String requestReplacement(int id)   => '$webBase/request-replacement/$id';

  // ── Refunds ────────────────────────────────────────────────────────────────
  static const String refundRequest  = '$base/refund/request';
  static String refundStatus(int id) => '$base/refund/status/$id';

  // ── Wishlist ───────────────────────────────────────────────────────────────
  static const String wishlist       = '$base/wishlist';
  static const String wishlistIds    = '$base/wishlist/ids';
  static const String wishlistToggle = '$base/wishlist/toggle';

  // ── Profile ────────────────────────────────────────────────────────────────
  static const String profile        = '$base/profile';
  static const String profileUpdate  = '$base/profile/update';
  static const String addAddress     = '$base/profile/address/add';
  static const String changePassword = '$base/profile/change-password';
  static String deleteAddress(int id) => '$base/profile/address/$id/delete';

  // ── Spending ───────────────────────────────────────────────────────────────
  static const String spendingSummary = '$base/spending-summary';

  // ── Coupons ────────────────────────────────────────────────────────────────
  static const String activeCoupons   = '$base/coupons';
  // FIX 2: validateCoupon and useCoupon were pointing to old web-session
  // endpoints (/api/coupon/validate and /api/coupon/use) that don't exist in
  // the Flutter API and return HTML.  Both operations are handled by a single
  // POST to /api/flutter/cart/coupon (apply) or DELETE for removal.
  static const String cartCoupon      = '$base/cart/coupon';
  // Kept for backward compatibility — both now point to the same Flutter endpoint.
  static const String validateCoupon  = '$base/cart/coupon';
  static const String useCoupon       = '$base/cart/coupon';

  // ── Order Tracking & Dispute ───────────────────────────────────────────────
  static String trackOrder(int id)       => '$base/orders/$id/track';
  static String reportIssue(int id)      => '$base/orders/$id/report-issue';

  // ── Share ──────────────────────────────────────────────────────────────────
  static String productWebUrl(int productId) => '$webBase/product/$productId';

  // ── Vendor ─────────────────────────────────────────────────────────────────
  static const String vendorProducts      = '$base/vendor/products';
  static const String vendorOrders        = '$base/vendor/orders';
  static const String vendorStats         = '$base/vendor/stats';
  static const String vendorAddProduct    = '$base/vendor/products/add';
  static const String vendorSalesReport   = '$base/vendor/sales-report';
  static const String vendorProfile       = '$base/vendor/profile';
  static const String vendorProfileUpdate = '$base/vendor/profile/update';
  static const String vendorStockAlerts   = '$base/vendor/stock-alerts';
  static String vendorUpdateProduct(int id) => '$base/vendor/products/$id/update';
  static String vendorDeleteProduct(int id) => '$base/vendor/products/$id/delete';
  static String acknowledgeAlert(int id)    => '$base/vendor/stock-alerts/$id/acknowledge';
  static String vendorMarkOrderReady(int orderId) =>
      '$base/vendor/orders/$orderId/mark-ready';

  // ── Admin ──────────────────────────────────────────────────────────────────
  static const String adminUsers    = '$base/admin/users';
  static const String adminProducts = '$base/admin/products';
  static const String adminOrders   = '$base/admin/orders';
  static const String adminVendors  = '$base/admin/vendors';
  static String adminToggleCustomer(int id)  => '$base/admin/customers/$id/toggle-active';
  static String adminToggleVendor(int id)    => '$base/admin/vendors/$id/toggle-active';
  static String adminApproveProduct(int id)  => '$base/admin/products/$id/approve';
  static String adminRejectProduct(int id)   => '$base/admin/products/$id/reject';
  static String adminOrderStatus(int id)     => '$base/admin/orders/$id/status';

  // Admin: Coupons
  static const String adminCoupons       = '$base/admin/coupons';
  static const String adminCreateCoupon  = '$base/admin/coupons/create';
  static String adminToggleCoupon(int id) => '$base/admin/coupons/toggle/$id';
  static String adminDeleteCoupon(int id) => '$base/admin/coupons/delete/$id';

  // Admin: Refunds
  static const String adminRefunds         = '$base/admin/refunds';
  static String adminProcessRefund(int orderId) => '$base/admin/refunds/$orderId/process';

  // Admin: Delivery management
  static const String adminDeliveryData     = '$base/admin/delivery/data';
  static const String adminApproveDelivery  = '$base/admin/delivery/boy/approve';
  static const String adminRejectDelivery   = '$base/admin/delivery/boy/reject';
  static const String adminAssignDelivery   = '$base/admin/delivery/assign';
  static String adminDeliveryBoysForOrder(int orderId) => '$base/admin/delivery/data';

  // Admin: Products bulk
  static const String adminApproveAll = '$base/admin/products/approve-all';

  // ── Delivery Boy ───────────────────────────────────────────────────────────
  static const String deliveryHome          = '$base/delivery/home';
  static const String deliveryWarehouses    = '$base/delivery/warehouses';
  static String deliveryPickup(int orderId)   => '$base/delivery/order/$orderId/pickup';
  static const String deliveryAvailabilityToggle = '$base/delivery/availability/toggle';
  static const String deliveryCodConfirm         = '$base/delivery/confirm';
  static String deliveryResendOtp(int orderId)   => '$base/delivery/order/$orderId/resend-otp';
  static String deliveryDeliver(int orderId)  => '$base/delivery/order/$orderId/deliver';
  static const String deliveryWarehouseChangeRequest =
      '$base/delivery/warehouse-change/request';

  // ── Geocoding / Location ───────────────────────────────────────────────────
  static const String geocodeAuto   = '$webBase/api/geocode/auto';
  static const String geocodePin    = '$webBase/api/geocode/pin';
  static const String geocodeByCity = '$webBase/api/geocode/by-city';
  static String checkPinCode(String pin) => '$webBase/api/check-pincode?pinCode=$pin';

  // ── Razorpay Online Payment ────────────────────────────────────────────────
  static const String razorpayCheckout   = '$base/orders/razorpay/checkout';
  static const String razorpayCallback   = '$base/orders/razorpay/callback';
  static const String razorpayPlaceOrder = '$base/orders/razorpay/place';

  // ── GST / Tax ──────────────────────────────────────────────────────────────
  static const String cartGst = '$base/cart/gst';

  // ── Invoice PDF Download ───────────────────────────────────────────────────
  static String invoiceDownload(int orderId) => '$webBase/customer/invoice/$orderId';

  // ── User Activity Tracking ─────────────────────────────────────────────────
  static const String userActivityBatch = '$base/user-activity/batch';

  // ── Reorder Stock Pre-Check ────────────────────────────────────────────────
  static String reorderStockCheck(int orderId) => '$base/orders/$orderId/reorder/check';

  // ── Customer Refunds Page ──────────────────────────────────────────────────
  static const String myRefunds = '$base/my-refunds';
  static String refundUploadImage(int refundId) => '$base/refund/$refundId/upload-image';
  static String refundImages(int refundId)      => '$base/refund/$refundId/images';

  // ── Admin: Settlement ──────────────────────────────────────────────────────
  static String adminSettlements({String? month}) =>
      '$base/admin/settlements${month != null ? '?month=$month' : ''}';
  static String adminProcessSettlement(String month) =>
      '$base/admin/settlements/process?month=$month';

  // ── Admin: User Activity (uses React API path) ─────────────────────────────
  static String adminUserActivity(int userId) =>
      '$webBase/api/user-activity/user/$userId';

  // ── Admin: Categories ──────────────────────────────────────────────────────
  static const String adminCategories           = '$base/admin/categories';
  static const String adminCategoriesParent     = '$base/admin/categories/parent';
  static const String adminCategoriesSub        = '$base/admin/categories/sub';
  static String adminCategoryUpdate(int id)     => '$base/admin/categories/$id/update';
  static String adminCategoryDelete(int id)     => '$base/admin/categories/$id/delete';

  // ── Admin: Policies ────────────────────────────────────────────────────────
  static const String adminPolicies             = '$base/admin/policies';
  static String adminPolicyBySlug(String slug)  => '$base/admin/policies/$slug';

  // ── Admin: Order management (extra) ───────────────────────────────────────
  static String adminOrderDetail(int id)        => '$base/admin/orders/$id';
  static String adminOrderCancel(int id)        => '$base/admin/orders/$id/cancel';
  static const String adminOrdersPacked         = '$base/admin/orders/packed';
  static const String adminOrdersShipped        = '$base/admin/orders/shipped';
  static const String adminOrdersOutForDelivery = '$base/admin/orders/out-for-delivery';
  static const String adminDeliveryConfirm      = '$base/admin/delivery/confirm';

  // ── Admin: Delivery load board ─────────────────────────────────────────────
  static const String adminDeliveryBoysLoad     = '$base/admin/delivery/boys/load';
  static String adminDeliveryBoyPins(int boyId) => '$base/admin/delivery/boy/$boyId/pins';
}