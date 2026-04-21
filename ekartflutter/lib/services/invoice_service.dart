import 'package:url_launcher/url_launcher.dart';
import '../config/api_config.dart';

/// Opens the GST invoice PDF for a delivered order in the device browser.
/// The PDF is generated server-side (same as the website) and served at
/// GET /customer/invoice/{orderId}.
class InvoiceService {
  /// Launch the invoice URL in an external browser / PDF viewer.
  /// Returns true on success, false if the URL couldn't be launched.
  static Future<bool> downloadInvoice(int orderId) async {
    final url = Uri.parse(ApiConfig.invoiceDownload(orderId));
    try {
      if (await canLaunchUrl(url)) {
        return launchUrl(url, mode: LaunchMode.externalApplication);
      }
      return false;
    } catch (_) {
      return false;
    }
  }
}
