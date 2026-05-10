import 'services.dart';

export 'services.dart' show VendorService;

class VendorProfileService {
  static Future<Map<String, dynamic>> getProfile() => VendorService.getProfile();

  static Future<Map<String, dynamic>> updateProfile({
    required String name,
    required String mobile,
  }) =>
      VendorService.updateProfile({'name': name, 'mobile': mobile});
}
