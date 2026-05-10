import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

Map<String, String> _customerHeaders() => {
      'Content-Type': 'application/json',
      'X-Customer-Id': '${AuthService.currentUser?.id ?? 0}',
    };

/// Represents a single GST slab line in the breakdown.
class GstSlabLine {
  final int    slabPercent;   // 5 | 12 | 18 | 28
  final double taxableAmount; // pre-tax base for this slab
  final double cgst;          // CGST portion (half of total)
  final double sgst;          // SGST portion (half of total)
  final double totalTax;      // cgst + sgst

  const GstSlabLine({
    required this.slabPercent,
    required this.taxableAmount,
    required this.cgst,
    required this.sgst,
    required this.totalTax,
  });

  factory GstSlabLine.fromJson(Map<String, dynamic> j) => GstSlabLine(
        slabPercent:   (j['slabPercent']   ?? j['slab']  ?? 18) as int,
        taxableAmount: (j['taxableAmount'] ?? j['base']  ?? 0).toDouble(),
        cgst:          (j['cgst']          ?? 0).toDouble(),
        sgst:          (j['sgst']          ?? 0).toDouble(),
        totalTax:      (j['totalTax']      ?? j['tax']   ?? 0).toDouble(),
      );
}

/// Full GST summary returned by the API (or computed locally as fallback).
class GstBreakdown {
  final double baseAmount;      // price excluding tax
  final double totalTax;        // total GST (all slabs)
  final double totalWithTax;    // baseAmount + totalTax
  final List<GstSlabLine> slabs;
  final bool   isEstimate;      // true when computed locally (backend unavailable)

  const GstBreakdown({
    required this.baseAmount,
    required this.totalTax,
    required this.totalWithTax,
    required this.slabs,
    this.isEstimate = false,
  });

  factory GstBreakdown.fromJson(Map<String, dynamic> j) => GstBreakdown(
        baseAmount:   (j['baseAmount']   ?? j['taxableTotal'] ?? 0).toDouble(),
        totalTax:     (j['totalTax']     ?? 0).toDouble(),
        totalWithTax: (j['totalWithTax'] ?? j['grandTotal']   ?? 0).toDouble(),
        slabs: (j['slabs'] as List? ?? [])
            .map((e) => GstSlabLine.fromJson(e as Map<String, dynamic>))
            .toList(),
        isEstimate: j['isEstimate'] == true,
      );

  /// Local fallback: given a cart total (inclusive of GST), compute an
  /// 18 % standard slab breakdown. Used when the /cart/gst endpoint fails.
  factory GstBreakdown.estimate(double cartTotal) {
    const rate    = 18;
    final base    = cartTotal / (1 + rate / 100);
    final tax     = cartTotal - base;
    final halfTax = tax / 2;
    return GstBreakdown(
      baseAmount:   base,
      totalTax:     tax,
      totalWithTax: cartTotal,
      slabs: [
        GstSlabLine(
          slabPercent:   rate,
          taxableAmount: base,
          cgst:          halfTax,
          sgst:          halfTax,
          totalTax:      tax,
        )
      ],
      isEstimate: true,
    );
  }
}

class GstService {
  /// Fetch GST breakdown for the current cart.
  /// Falls back to a local 18 % estimate if the backend endpoint is unavailable.
  static Future<GstBreakdown?> getCartGst(double cartTotal) async {
    if (cartTotal <= 0) return null;
    try {
      final r = await http.get(
        Uri.parse(ApiConfig.cartGst),
        headers: _customerHeaders(),
      );
      if (r.statusCode == 200) {
        final body = r.body.trim();
        if (!body.startsWith('<') && body.isNotEmpty) {
          final d = jsonDecode(body) as Map<String, dynamic>;
          if (d['success'] == true) {
            return GstBreakdown.fromJson(d);
          }
        }
      }
      // Endpoint exists but returned non-success — still show estimate
      return GstBreakdown.estimate(cartTotal);
    } catch (_) {
      return GstBreakdown.estimate(cartTotal);
    }
  }
}