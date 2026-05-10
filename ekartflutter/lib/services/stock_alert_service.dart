import 'services.dart';

export 'services.dart' show VendorService;

// Backwards-compat alias
class StockAlertService {
  static getAlerts() => VendorService.getStockAlerts();
  static acknowledgeAlert(int id) => VendorService.acknowledgeAlert(id);
}
