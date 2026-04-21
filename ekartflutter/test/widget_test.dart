import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ekart/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // ✅ Fixed: EkartApp instead of deprecated MyApp
    await tester.pumpWidget(const EkartApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
