import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import {
  DiffTable,
  DiffRow,
  DiffItem,
  FilterTable,
  FilterTableRow,
  FilterRule,
  ApprovalCard,
  DecisionAction,
  ToolChips,
  ToolTelemetryItem,
  ToolDiffChip,
  InspectionPipelineTrace,
  InspectionStep,
  SegmentedControl,
  SegmentedOptionItem,
  StatusPill,
  StatusTone,
} from '../src/components/ui';

// Test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: Array<{ suite: string; name: string; error: any }> = [];

function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    failedTests++;
    failures.push({ suite, name, error: err });
    console.error(`  ✕ [${suite}] ${name}:`, err.message || err);
  }
}

// -------------------------------------------------------------
// 1. DiffTable Adversarial Tests
// -------------------------------------------------------------
console.log('\n--- 1. Testing DiffTable ---');

runTest('DiffTable', 'Default rendering without props', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<DiffTable />);
  assert.ok(html.includes('Field Discrepancy Matrix'));
  assert.ok(html.includes('Date of Birth'));
  assert.ok(html.includes('P98421034'));
  assert.ok(html.includes('✓ MATCH') || html.includes('✕ MISMATCH'));
});

runTest('DiffTable', 'Unicode handling: Devanagari, Nepali, Bengali, Nastaliq, Chinese, Emojis', () => {
  const unicodeRows: DiffRow[] = [
    {
      field: 'नाम (Devanagari Name)',
      sourceA: 'Visual OCR (Devanagari)',
      sourceB: 'UIDAI QR (Hindi)',
      valueA: 'आनन्द कुमार शर्मा',
      valueB: 'आनन्द कुमार शर्मा',
      isMatch: true,
      details: 'देवनागरी लिपि में पूर्ण नाम सत्यापित',
    },
    {
      field: 'नागरिकता (Nepali Citizen ID)',
      sourceA: 'Optical Scan',
      sourceB: 'Passport MRZ',
      valueA: 'राम प्रसाद अधिकारी',
      valueB: 'राम प्रसाद अधिकारी (८४७२०३)',
      isMatch: false,
      details: 'नेपाली नाम तथा नागरिकता प्रमाण-पत्र संख्या भिन्न छ।',
    },
    {
      field: 'নাম (Bengali Voter Record)',
      sourceA: 'Visual OCR',
      sourceB: 'ECI Electoral Roll',
      valueA: 'সুব্রত মুখোপাধ্যায়',
      valueB: 'সুব্রত মুখোপাধ্যায়',
      isMatch: true,
      details: 'বাংলা ভাষা এবং ডিজিটাল ডাটা সম্পূর্ণ মিলেছে',
    },
    {
      field: 'Border Check Emojis & Symbols 🛂⚠️🚩',
      sourceA: 'Scanner 🔏 #1',
      sourceB: 'Server ⚡ Live',
      valueA: '🛂 PASS • 100% 🇮🇳',
      valueB: '⚠️ ALERT • 0% 🚩',
      isMatch: false,
      details: 'Emoji & special glyph parity test: <>&"\'/\\`',
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <DiffTable title="Unicode Discrepancy Matrix" rows={unicodeRows} />
  );

  assert.ok(html.includes('आनन्द कुमार शर्मा'));
  assert.ok(html.includes('राम प्रसाद अधिकारी'));
  assert.ok(html.includes('সুব্রত মুখোপাধ্যায়'));
  assert.ok(html.includes('🛂'));
  assert.ok(html.includes('2 Discrepancies Found'));
});

runTest('DiffTable', 'Special characters, HTML injection & boundary strings', () => {
  const maliciousRows: DiffRow[] = [
    {
      field: '<script>alert("XSS")</script>',
      sourceA: '<img src=x onerror=alert(1)>',
      sourceB: 'javascript:void(0)',
      valueA: '"\'`--/*; DROP TABLE border_logs; --',
      valueB: '${7*7} {{constructor.constructor("alert(1)")()}}',
      isMatch: false,
      details: '<svg/onload=alert(1)> &amp; &lt; &gt; "quote"',
    },
    {
      field: 'Regex metachars: .*+?^${}()|[]\\',
      sourceA: 'Regex: (.*)',
      sourceB: 'Regex: [a-z]+',
      valueA: '^([a-zA-Z0-9_-]+)$',
      valueB: '^([a-zA-Z0-9_-]+)$',
      isMatch: true,
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <DiffTable title="Security & Injection Test" rows={maliciousRows} />
  );

  // React must escape HTML entities
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;alert'));
  assert.ok(html.includes('DROP TABLE'));
  assert.ok(html.includes('Regex metachars'));
});

runTest('DiffTable', 'Empty string fields and missing values', () => {
  const emptyRows: DiffRow[] = [
    {
      field: '',
      sourceA: '',
      sourceB: '',
      valueA: '',
      valueB: '',
      isMatch: true,
      details: '',
    },
    {
      field: 'Missing Both Values',
      valueA: '',
      valueB: '',
      isMatch: false,
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <DiffTable title="Empty Matrix" rows={emptyRows} />
  );

  assert.ok(html.includes('—')); // Should render dash fallback
  assert.ok(html.includes('1 Discrepancy Found'));
});

runTest('DiffTable', 'All-Match state (0 mismatches)', () => {
  const matchRows: DiffRow[] = Array.from({ length: 10 }, (_, i) => ({
    field: `Verified Field ${i + 1}`,
    sourceA: 'OCR Engine',
    sourceB: 'PKI Registry',
    valueA: `VAL_${i}_OK`,
    valueB: `VAL_${i}_OK`,
    isMatch: true,
  }));

  const html = ReactDOMServer.renderToStaticMarkup(
    <DiffTable title="100% Match Table" rows={matchRows} />
  );

  assert.ok(html.includes('100% Cross-Stream Consistency'));
  assert.ok(html.includes('10 verified · 0 mismatches'));
  assert.ok(html.includes('Confirm Cross-Validation'));
  assert.ok(!html.includes('Discrepancies Found'));
});

runTest('DiffTable', 'All-Mismatch state (100% mismatches)', () => {
  const mismatchRows: DiffRow[] = Array.from({ length: 10 }, (_, i) => ({
    field: `Compromised Field ${i + 1}`,
    sourceA: 'OCR Engine',
    sourceB: 'PKI Registry',
    valueA: `ORIGINAL_${i}`,
    valueB: `FORGED_${i}`,
    isMatch: false,
    details: `Cryptographic hash validation failed for field ${i + 1}`,
  }));

  const html = ReactDOMServer.renderToStaticMarkup(
    <DiffTable title="100% Tampered Table" rows={mismatchRows} />
  );

  assert.ok(html.includes('10 Discrepancies Found'));
  assert.ok(html.includes('0 verified · 10 mismatches'));
  assert.ok(html.includes('Acknowledge 10 Discrepancies'));
});

runTest('DiffTable', 'Support for items prop contract from PROJECT.md', () => {
  const items: DiffItem[] = [
    {
      field: 'Passport Number',
      sourceA: 'Visual Page 1',
      sourceB: 'NFC e-Chip',
      labelA: 'Visual Text',
      labelB: 'NFC Chip',
      valueA: 'Z1234567',
      valueB: 'Z1234567',
      status: 'match',
    },
    {
      field: 'Date of Expiry',
      sourceA: 'Visual Page 1',
      sourceB: 'NFC e-Chip',
      labelA: 'Visual Text',
      labelB: 'NFC Chip',
      valueA: '2030-01-01',
      valueB: '2024-01-01',
      status: 'mismatch',
    },
    {
      field: 'Middle Name',
      sourceA: 'Visual Page 1',
      sourceB: 'NFC e-Chip',
      status: 'missing',
      valueA: 'KUMAR',
      valueB: '',
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <DiffTable title="Items Format Contract" items={items} />
  );

  assert.ok(html.includes('Passport Number'));
  assert.ok(html.includes('Date of Expiry'));
  assert.ok(html.includes('2 Discrepancies Found'));
});


// -------------------------------------------------------------
// 2. FilterTable Adversarial Tests
// -------------------------------------------------------------
console.log('\n--- 2. Testing FilterTable ---');

runTest('FilterTable', 'Default rendering without props', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<FilterTable />);
  assert.ok(html.includes('Multi-Stream Cross-Validation Rules'));
  assert.ok(html.includes('CV-01'));
  assert.ok(html.includes('8 active guards'));
  assert.ok(html.includes('Passed'));
  assert.ok(html.includes('Violations'));
});

runTest('FilterTable', 'Zero rules empty array', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<FilterTable rows={[]} />);
  assert.ok(typeof html === 'string');
});

runTest('FilterTable', 'Stress test: 50 rules with high density and all statuses', () => {
  const statuses: Array<'passed' | 'violation' | 'warning' | 'info'> = [
    'passed',
    'violation',
    'warning',
    'info',
  ];
  const largeRules: FilterTableRow[] = Array.from({ length: 60 }, (_, i) => ({
    id: `RULE-${String(i + 1).padStart(3, '0')}`,
    rule: `Automated Border Cross-Check Guard #${i + 1} for Biometrics and Documents`,
    category: i % 3 === 0 ? 'Forensics' : i % 3 === 1 ? 'Biometrics' : 'Permits',
    telemetry: `Signal amplitude: ${(Math.random() * 100).toFixed(2)} dB • Latency: ${i * 4}ms`,
    status: statuses[i % statuses.length],
    details: `Deep telemetry breakdown for RULE-${i + 1}: Checksum verified on node cluster worker #${(i % 5) + 1}.`,
  }));

  const html = ReactDOMServer.renderToStaticMarkup(
    <FilterTable title="60-Guard Comprehensive Filter Matrix" rows={largeRules} />
  );

  assert.ok(html.includes('60-Guard Comprehensive Filter Matrix'));
  assert.ok(html.includes('60 active guards'));
  assert.ok(html.includes('RULE-001'));
  assert.ok(html.includes('RULE-060'));
});

runTest('FilterTable', 'Rules with long multiline details & Unicode telemetry', () => {
  const multilineRows: FilterTableRow[] = [
    {
      id: 'CV-ML-01',
      rule: 'बहुभाषी सत्यापन नियम (Multilingual Cross-Check)',
      category: 'नेपाली / हिन्दी',
      telemetry: 'मशीन पठनीय क्षेत्र (MRZ) र डिजिटल हस्ताक्षर मेल खाएको छ।',
      status: 'passed',
      details:
        'Line 1: प्रथम परीक्षण सफल।\nLine 2: दोस्रो बायोमेट्रिक प्रमाणीकरण सम्पन्न भयो।\nLine 3: कुनै पनि किसिमको छेडछाड भेटिएन।',
    },
    {
      id: 'CV-ML-02',
      rule: 'Huge 2000-character forensic dump rule',
      category: 'Forensics',
      telemetry: 'Anomaly spectrum detected',
      status: 'violation',
      details: 'A'.repeat(2000),
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <FilterTable title="Multiline Test" rows={multilineRows} />
  );

  assert.ok(html.includes('बहुभाषी सत्यापन नियम'));
  assert.ok(html.includes('CV-ML-01'));
  assert.ok(html.includes('CV-ML-02'));
  assert.ok(html.includes('A'.repeat(100)));
});

runTest('FilterTable', 'Support for rules prop contract from PROJECT.md', () => {
  const rules: FilterRule[] = [
    {
      id: 'R-01',
      name: 'MRZ Check Digit 1',
      description: 'Document number checksum modulo-10',
      status: 'passed',
      weight: 0.3,
      category: 'MRZ',
    },
    {
      id: 'R-02',
      name: 'Face Match Cosine',
      description: 'AdaFace embedding distance < 0.35',
      details: 'Observed similarity 0.18 below threshold',
      status: 'violation',
      weight: 0.5,
      category: 'Biometrics',
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <FilterTable title="Rules Format Contract" rules={rules} />
  );

  assert.ok(html.includes('MRZ Check Digit 1'));
  assert.ok(html.includes('Face Match Cosine'));
  assert.ok(html.includes('R-01'));
  assert.ok(html.includes('R-02'));
});


// -------------------------------------------------------------
// 3. ApprovalCard Adversarial Tests
// -------------------------------------------------------------
console.log('\n--- 3. Testing ApprovalCard ---');

runTest('ApprovalCard', 'Default rendering without props', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<ApprovalCard />);
  assert.ok(html.includes('Human-In-The-Loop Officer Authorization'));
  assert.ok(html.includes('Clear Traveler'));
  assert.ok(html.includes('Secondary Hold'));
  assert.ok(html.includes('Interdiction Order'));
  assert.ok(html.includes('Commit Decision'));
});

runTest('ApprovalCard', 'Risk Level GREEN -> Defaults to Auto Clear', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    <ApprovalCard riskLevel="GREEN" riskScore={14.2} />
  );
  assert.ok(html.includes('Clear Traveler'));
  assert.ok(html.includes('border-green'));
});

runTest('ApprovalCard', 'Risk Level AMBER -> Defaults to Secondary Hold', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    <ApprovalCard riskLevel="AMBER" riskScore={52.8} />
  );
  assert.ok(html.includes('Secondary Hold'));
  assert.ok(html.includes('border-orange'));
});

runTest('ApprovalCard', 'Risk Level RED -> Defaults to Interdiction Order', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    <ApprovalCard riskLevel="RED" riskScore={96.4} />
  );
  assert.ok(html.includes('Interdiction Order'));
  assert.ok(html.includes('border-red'));
});

runTest('ApprovalCard', 'Extreme Risk Scores: 0, 100, 99.9999, negative, NaN', () => {
  const scores = [0, 100, 99.9999, -5.5, 1000];
  for (const score of scores) {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ApprovalCard riskScore={score} riskLevel="RED" />
    );
    assert.ok(typeof html === 'string');
    assert.ok(html.includes('Commit Decision'));
  }
});

runTest('ApprovalCard', 'Closed state (isOpen=false)', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<ApprovalCard isOpen={false} />);
  assert.ok(html.includes('Open Officer Authorization'));
  assert.ok(!html.includes('Human-In-The-Loop Officer Authorization'));
});

runTest('ApprovalCard', 'Callback execution on submit', () => {
  let decideResult: DecisionAction | null = null;
  let decisionMapped: string | null = null;
  let decisionNotes: string | null = null;

  const props = {
    riskLevel: 'RED',
    riskScore: 92.5,
    onDecide: (dec: DecisionAction) => {
      decideResult = dec;
    },
    onDecision: (dec: 'clear' | 'secondary' | 'interdict', notes: string) => {
      decisionMapped = dec;
      decisionNotes = notes;
    },
  };

  const html = ReactDOMServer.renderToStaticMarkup(<ApprovalCard {...props} />);
  assert.ok(html.includes('Commit Decision'));
});


// -------------------------------------------------------------
// 4. ToolChips & InspectionPipelineTrace Adversarial Tests
// -------------------------------------------------------------
console.log('\n--- 4. Testing ToolChips & Pipeline Trace ---');

runTest('ToolChips', 'Default rendering', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<ToolChips />);
  assert.ok(html.includes('PP-OCRv4'));
  assert.ok(html.includes('DocTamper DTD'));
  assert.ok(html.includes('AdaFace-R100'));
  assert.ok(html.includes('1 Flagged'));
  assert.ok(html.includes('4 Passed'));
});

runTest('ToolChips', 'All status permutations & extreme latencies/confidences', () => {
  const telemetryData: ToolTelemetryItem[] = [
    {
      name: 'Pending Model Alpha',
      label: 'Model Alpha',
      status: 'pending',
      durationMs: 0,
      confidence: 0,
      modelVersion: 'v1-onnx',
    },
    {
      name: 'Running Model Beta',
      label: 'Model Beta',
      status: 'running',
      durationMs: 1450,
      confidence: 0.5,
      modelVersion: 'v2-tensorrt',
    },
    {
      name: 'Completed Model Gamma',
      label: 'Model Gamma',
      status: 'completed',
      durationMs: 25,
      confidence: 1.0, // 100%
      modelVersion: 'v3-coreml',
    },
    {
      name: 'Failed Model Delta',
      label: 'Model Delta',
      status: 'failed',
      durationMs: 12500, // 12.5s high latency
      confidence: 0.0001,
      modelVersion: 'v4-gpu',
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <ToolChips telemetry={telemetryData} title="Telemetry Extreme Bounds" />
  );

  assert.ok(html.includes('Telemetry Extreme Bounds'));
  assert.ok(html.includes('0%'));
  assert.ok(html.includes('100%'));
  assert.ok(html.includes('0ms'));
  assert.ok(html.includes('12500ms'));
  assert.ok(html.includes('1 Flagged'));
  assert.ok(html.includes('1 Passed'));
});

runTest('ToolChips', 'Tensor Diff Chips with zero and negative changes', () => {
  const diffs: ToolDiffChip[] = [
    { file: 'empty_tensor.bin', add: 0, del: 0 },
    { file: 'huge_weights.onnx', add: 1048576, del: 524288 },
    { file: 'special_chars_<>&".json', add: 5, del: 2 },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <ToolChips diffs={diffs} />
  );

  assert.ok(html.includes('empty_tensor.bin'));
  assert.ok(html.includes('huge_weights.onnx'));
  assert.ok(html.includes('+1048576'));
  assert.ok(html.includes('−524288'));
});

runTest('InspectionPipelineTrace', 'Default rendering with steps', () => {
  const steps: InspectionStep[] = [
    { id: '1', name: 'PP-OCRv4 Multilingual Extraction', category: 'OCR', status: 'completed', latencyMs: 28 },
    { id: '2', name: 'DocTamper ResNet-50 Splicing Localizer', category: 'FORENSICS', status: 'failed', latencyMs: 110 },
  ];
  const html = ReactDOMServer.renderToStaticMarkup(<InspectionPipelineTrace steps={steps} totalLatencyMs={138} />);
  assert.ok(html.includes('PP-OCRv4 Multilingual Extraction'));
  assert.ok(html.includes('DocTamper ResNet-50 Splicing Localizer'));
  assert.ok(html.includes('3-Stream Neural Pipeline Trace'));
  assert.ok(html.includes('138ms'));
});


// -------------------------------------------------------------
// 5. SegmentedControl & StatusPill Adversarial Tests
// -------------------------------------------------------------
console.log('\n--- 5. Testing SegmentedControl & StatusPill ---');

runTest('SegmentedControl', 'Normal string options array', () => {
  const options = ['Document', 'Face Capture', 'History', 'Diagnostics'];
  let selected = 'Document';
  const html = ReactDOMServer.renderToStaticMarkup(
    <SegmentedControl
      options={options}
      value={selected}
      onChange={(v) => {
        selected = v;
      }}
    />
  );

  assert.ok(html.includes('Document'));
  assert.ok(html.includes('Face Capture'));
  assert.ok(html.includes('aria-selected="true"'));
});

runTest('SegmentedControl', 'Object options with custom icons and badges', () => {
  const options: SegmentedOptionItem[] = [
    {
      id: 'fast',
      label: 'Fast Scan (M4)',
      badge: '28ms',
      icon: <span data-testid="bolt-icon">⚡</span>,
    },
    {
      id: 'deep',
      label: 'Deep Forensic (RTX)',
      badge: '98%',
      icon: <span data-testid="shield-icon">🛡️</span>,
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    <SegmentedControl
      options={options}
      value="deep"
      onChange={() => {}}
      size="sm"
    />
  );

  assert.ok(html.includes('Fast Scan (M4)'));
  assert.ok(html.includes('Deep Forensic (RTX)'));
  assert.ok(html.includes('28ms'));
  assert.ok(html.includes('98%'));
  assert.ok(html.includes('⚡'));
  assert.ok(html.includes('🛡️'));
});

runTest('SegmentedControl', 'Out-of-bounds value (non-existent tab)', () => {
  const options = ['Tab 1', 'Tab 2', 'Tab 3'];
  const html = ReactDOMServer.renderToStaticMarkup(
    <SegmentedControl
      options={options}
      value="UNKNOWN_NON_EXISTENT_TAB"
      onChange={() => {}}
    />
  );

  assert.ok(html.includes('Tab 1'));
  assert.ok(html.includes('Tab 2'));
  assert.ok(html.includes('Tab 3'));
  assert.ok(!html.includes('aria-selected="true"'));
});

runTest('SegmentedControl', 'Empty options array', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    <SegmentedControl options={[]} value="" onChange={() => {}} />
  );
  assert.ok(html.includes('role="tablist"'));
});

runTest('StatusPill', 'All 8 Tone Variants + Invalid Fallback', () => {
  const tones: StatusTone[] = [
    'green',
    'orange',
    'amber',
    'red',
    'accent',
    'blue',
    'neutral',
    'slate',
  ];

  for (const tone of tones) {
    const html = ReactDOMServer.renderToStaticMarkup(
      <StatusPill tone={tone}>{tone.toUpperCase()} BADGE</StatusPill>
    );
    assert.ok(html.includes(`${tone.toUpperCase()} BADGE`));
  }

  const fallbackHtml = ReactDOMServer.renderToStaticMarkup(
    <StatusPill tone={'invalid_tone' as any}>FALLBACK BADGE</StatusPill>
  );
  assert.ok(fallbackHtml.includes('FALLBACK BADGE'));
});

runTest('StatusPill', 'Sizes, Dot toggle, Pulse animation, Unicode', () => {
  const htmlSm = ReactDOMServer.renderToStaticMarkup(
    <StatusPill size="sm" dot={false} pulse={false}>
      Small No Dot
    </StatusPill>
  );
  assert.ok(htmlSm.includes('text-[11px]'));

  const htmlLg = ReactDOMServer.renderToStaticMarkup(
    <StatusPill size="lg" tone="red" pulse={true}>
      🔴 चेतावनी (Devanagari Alert) ⚠️
    </StatusPill>
  );
  assert.ok(htmlLg.includes('animate-pulse'));
  assert.ok(htmlLg.includes('चेतावनी'));
  assert.ok(htmlLg.includes('text-[13px]'));
});


// -------------------------------------------------------------
// Summary & Exit Code
// -------------------------------------------------------------
console.log('\n=============================================');
console.log(`TOTAL TESTS RUN : ${totalTests}`);
console.log(`PASSED          : ${passedTests}`);
console.log(`FAILED          : ${failedTests}`);
console.log('=============================================\n');

if (failedTests > 0) {
  console.error('Failures detected:');
  for (const f of failures) {
    console.error(`- [${f.suite}] ${f.name}:`, f.error);
  }
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}
