import 'services.dart';

export 'services.dart' show ProfileService;

// Backwards-compat alias
class SecurityService {
  static Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) =>
      ProfileService.changePassword(currentPassword, newPassword);
}
