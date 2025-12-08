import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:roadsense_map_demo/main.dart';

void main() {
  testWidgets('Report logging updates the dashboard', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('Reports logged: 3'), findsOneWidget);
    expect(find.text('Reports logged: 4'), findsNothing);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Log new report'));
    await tester.pump();

    expect(find.text('Reports logged: 4'), findsOneWidget);
  });
}
