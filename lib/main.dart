import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class RoadReport {
  const RoadReport({
    required this.location,
    required this.severity,
    required this.description,
  });

  final String location;
  final SeverityLevel severity;
  final String description;
}

enum SeverityLevel { low, moderate, high }

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RoadSense Map Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'RoadSense Map Demo'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  late List<RoadReport> _reports;

  @override
  void initState() {
    super.initState();
    _reports = const [
      RoadReport(
        location: 'EDSA & Ayala Ave',
        severity: SeverityLevel.high,
        description: 'Heavy congestion due to stalled vehicle.',
      ),
      RoadReport(
        location: 'C5 near Bagong Ilog',
        severity: SeverityLevel.moderate,
        description: 'Slowdown from ongoing drainage works.',
      ),
      RoadReport(
        location: 'Commonwealth Ave',
        severity: SeverityLevel.low,
        description: 'Light rain, minor visibility issues.',
      ),
    ];
  }

  void _addReport() {
    final nextIndex = _reports.length + 1;
    setState(() {
      _reports = [
        ..._reports,
        RoadReport(
          location: 'New report #$nextIndex',
          severity: SeverityLevel.low,
          description: 'Logged for follow-up review.',
        ),
      ];
    });
  }

  int get _reportCount => _reports.length;

  Color _severityColor(SeverityLevel level, BuildContext context) {
    switch (level) {
      case SeverityLevel.high:
        return Colors.red.shade400;
      case SeverityLevel.moderate:
        return Colors.amber.shade700;
      case SeverityLevel.low:
        return Theme.of(context).colorScheme.primary;
    }
  }

  String _severityLabel(SeverityLevel level) {
    switch (level) {
      case SeverityLevel.high:
        return 'High';
      case SeverityLevel.moderate:
        return 'Moderate';
      case SeverityLevel.low:
        return 'Low';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Stay ahead of road incidents with quick status checks and logged reports.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Card(
              color: Theme.of(context).colorScheme.secondaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: Theme.of(context).colorScheme.onSecondaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Reports logged: $_reportCount',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _reports.length,
                itemBuilder: (context, index) {
                  final report = _reports[index];
                  final severityColor = _severityColor(report.severity, context);
                  final severityLabel = _severityLabel(report.severity);
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  report.location,
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Chip(
                                label: Text(severityLabel),
                                backgroundColor: severityColor.withOpacity(0.12),
                                labelStyle: TextStyle(color: severityColor),
                                shape: StadiumBorder(
                                  side: BorderSide(color: severityColor),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            report.description,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _addReport,
                icon: const Icon(Icons.add_location_alt_outlined),
                label: const Text('Log new report'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
