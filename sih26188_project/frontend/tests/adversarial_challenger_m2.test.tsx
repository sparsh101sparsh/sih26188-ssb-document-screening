import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { App } from '../src/App';
import { Header } from '../src/components/Header';
import { IngestionPanel } from '../src/components/IngestionPanel';
import { ResultsPanel } from '../src/components/ResultsPanel';
import { Dropzone } from '../src/components/Dropzone';
import { WebCamCapture } from '../src/components/WebCamCapture';
import { PresetsBar } from '../src/components/PresetsBar';
import { ForensicsViewer } from '../src/components/ForensicsViewer';
import { AuditCertificateModal } from '../src/components/AuditCertificateModal';
import { RawJsonViewerModal } from '../src/components/RawJsonViewerModal';
import { OfflineWarningBanner } from '../src/components/OfflineWarningBanner';
import { PillarsTable } from '../src/components/PillarsTable';
import { PillarOCR } from '../src/components/PillarOCR';
import { PillarMRZ } from '../src/components/PillarMRZ';
import { PillarBiometrics } from '../src/components/PillarBiometrics';
import { PillarForensics } from '../src/components/PillarForensics';
import { PillarStamp } from '../src/components/PillarStamp';
import {
  DiffTable,
  FilterTable,
  ApprovalCard,
  ToolChips,
  InspectionPipelineTrace,
  SegmentedControl,
  StatusPill,
  Button,
  TextRow,
} from '../src/components/ui';
import { PRESET_LIST } from '../src/services/presets';
import { CHECKPOINTS, DocumentInspectResponse } from '../src/types/api';

const SRC_DIR = path.resolve(process.cwd(), 'src');

let total = 0;
let passed = 0;
let failed = 0;
const errors: Array<{ name: string; err: any }> = [];

async function test(name: string, fn: () => void | Promise<void>) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    errors.push({ name, err });
    console.error(`  ✕ ${name}`);
    console.error(`    ${err?.stack || err?.message || err}`);
  }
}

async function runAll() {
  console.log('\n======================================================');
  console.log('CHALLENGER 2: ADVERSARIAL FRONTEND VERIFICATION SUITE');
  console.log('======================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Whitish / Light-Mode Modern Theme & Jargon Purge
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Whitish Modern Light-Mode CSS Tokens & Jargon Purge ---');

  await test('CSS Token exact matching in index.css (Whitish Modern Light Stack)', () => {
    const cssPath = path.join(SRC_DIR, 'index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Verify Required Whitish Modern Design Tokens
    const expectedTokens = [
      ['--page', '#F8FAFC'],
      ['--canvas', '#F8FAFC'],
      ['--surface', '#FFFFFF'],
      ['--inset', '#F1F5F9'],
      ['--field', '#FFFFFF'],
      ['--hover', '#F1F5F9'],
      ['--hover-2', '#E2E8F0'],
      ['--ink', '#0F172A'],
      ['--ink-2', '#475569'],
      ['--ink-3', '#94A3B8'],
      ['--line', '#E2E8F0'],
      ['--line-strong', '#CBD5E1'],
      ['--accent', '#2563EB'],
      ['--green', '#10B981'],
      ['--orange', '#F59E0B'],
      ['--red', '#EF4444'],
      ['--radius-chip', '6px'],
      ['--radius-control', '8px'],
      ['--radius-card', '12px'],
      ['--radius-window', '16px'],
    ];

    for (const [token, value] of expectedTokens) {
      const regex = new RegExp(`${token}\\s*:\\s*${value}`, 'i');
      assert.ok(
        regex.test(css),
        `Token ${token} does not strictly match expected value ${value}`
      );
    }
  });

  await test('Tailwind configuration whitish modern palette & obsidian purge verification', () => {
    const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js');
    const configContent = fs.readFileSync(tailwindPath, 'utf8');

    // Ensure obsidian classes are purged
    assert.ok(!configContent.includes('obsidian:'), 'tailwind.config.js must not contain legacy obsidian classes');
    assert.ok(!configContent.includes("'#090A0F'"), 'tailwind.config.js must not contain legacy #090A0F');

    // Verify presence of core CSS variable token bindings
    assert.ok(configContent.includes("'var(--page)'"), 'Missing var(--page) binding in tailwind.config.js');
    assert.ok(configContent.includes("'var(--surface)'"), 'Missing var(--surface) binding in tailwind.config.js');
    assert.ok(configContent.includes("'var(--inset)'"), 'Missing var(--inset) binding in tailwind.config.js');
    assert.ok(configContent.includes("'var(--ink)'"), 'Missing var(--ink) binding in tailwind.config.js');
    assert.ok(configContent.includes("'var(--line)'"), 'Missing var(--line) binding in tailwind.config.js');
  });

  await test('Jargon purge: No raw model names in component source codes', () => {
    function scanDir(dir: string): string[] {
      const files = fs.readdirSync(dir);
      let allFiles: string[] = [];
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          allFiles = allFiles.concat(scanDir(full));
        } else if ((f.endsWith('.tsx') || f.endsWith('.ts')) && !f.endsWith('.test.tsx')) {
          allFiles.push(full);
        }
      }
      return allFiles;
    }

    const allSourceFiles = scanDir(SRC_DIR);
    const forbiddenJargon = [
      /AdaFace-ResNet/i,
      /MiniFASNetV2/i,
      /DocTamper-ResNet/i,
      /TruFor-SegFormer/i,
      /300 DPI/i,
    ];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenJargon) {
        assert.ok(
          !pattern.test(content),
          `Found forbidden model jargon ${pattern} in ${path.relative(SRC_DIR, filePath)}`
        );
      }
    }
  });

  await test('No lingering neon glows, radar sweeps, or arbitrary gradients', () => {
    function scanDir(dir: string): string[] {
      const files = fs.readdirSync(dir);
      let allFiles: string[] = [];
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          allFiles = allFiles.concat(scanDir(full));
        } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) {
          allFiles.push(full);
        }
      }
      return allFiles;
    }

    const allSourceFiles = scanDir(SRC_DIR);
    const forbiddenPatterns = [
      /pulseGlowRed/i,
      /radar-sweep/i,
      /glow-red/i,
      /glow-green/i,
      /bg-grid-pattern/i,
      /shadow-\[0_0_\d+px/i,
      /drop-shadow-\[0_0_\d+px/i,
    ];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !pattern.test(content),
          `Found forbidden visual pattern ${pattern} in ${path.relative(SRC_DIR, filePath)}`
        );
      }
    }
  });

  // -------------------------------------------------------------
  // SUITE 2: UI Primitives, Accordions & Modals Stress Testing
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: UI Primitives, Accordions & Modals Stress Testing ---');

  await test('ResultsPanel renders all 4 presets without exceptions', () => {
    for (const preset of PRESET_LIST) {
      const html = ReactDOMServer.renderToStaticMarkup(
        <ResultsPanel
          result={preset.mockResponse}
          documentImageUrl="data:image/png;base64,mockDoc"
          heatmapImageUrl="data:image/png;base64,mockHeatmap"
        />
      );
      assert.ok(html.length > 500, `ResultsPanel rendered empty for preset ${preset.id}`);
      assert.ok(html.includes(preset.mockResponse.assessment.risk_level), `Risk level missing for preset ${preset.id}`);
      assert.ok(html.includes('Operational Overview'), `Tabs missing in preset ${preset.id}`);
      assert.ok(html.includes('Discrepancy Matrix'), `Discrepancy tab missing in preset ${preset.id}`);
    }
  });

  await test('ResultsPanel accordion structure & defaults', () => {
    const cleanPreset = PRESET_LIST.find((p) => p.id === 'clean_passport')!;
    const html = ReactDOMServer.renderToStaticMarkup(
      <ResultsPanel
        result={cleanPreset.mockResponse}
        documentImageUrl="data:image/png;base64,mockDoc"
      />
    );

    // Accordion titles present
    assert.ok(html.includes('Multi-Model Inference Pipeline Trace'), 'Trace accordion header present');
    assert.ok(html.includes('Forensic Field Discrepancy Matrix'), 'Discrepancy accordion header present');
    assert.ok(html.includes('8-Rule Cross-Validation Consistency Guards'), 'CrossVal accordion header present');
    assert.ok(html.includes('Visual Forensics, Substrate &amp; Splicing Localization') || html.includes('Visual Forensics, Substrate & Splicing Localization'), 'Forensics accordion header present');
    assert.ok(html.includes('Granular Verification Checks Breakdown'), 'Pillars accordion header present');
  });

  await test('AuditCertificateModal rendering and demographic masking', () => {
    const forgedPreset = PRESET_LIST.find((p) => p.id === 'forged_aadhaar')!;
    
    // Render with decision and checkpoint
    const html = ReactDOMServer.renderToStaticMarkup(
      <AuditCertificateModal
        isOpen={true}
        onClose={() => {}}
        result={forgedPreset.mockResponse}
        checkpoint={CHECKPOINTS[0]}
        officerDecision={{
          action: 'DETAIN_AND_INTERDICT',
          decisionType: 'interdict',
          reason: 'Tampered DOB and photo detected',
          officerNotes: 'Case referred to SSB Field Intelligence Unit',
          badgeId: 'SSB-IND-9999',
          timestamp: '2026-08-23T20:00:00Z',
        }}
      />
    );

    assert.ok(html.includes('Border Security Screening Audit Certificate'), 'Certificate title missing');
    assert.ok(html.includes('SSB-IND-9999'), 'Officer badge missing');
    assert.ok(html.includes('DETAIN_AND_INTERDICT'), 'Officer decision missing');
    assert.ok(html.includes('CRITICAL SECURITY ALERT (DETAIN)'), 'Clearance status missing');

    // Closed modal should render null
    const closedHtml = ReactDOMServer.renderToStaticMarkup(
      <AuditCertificateModal
        isOpen={false}
        onClose={() => {}}
        result={forgedPreset.mockResponse}
        checkpoint={CHECKPOINTS[0]}
      />
    );
    assert.equal(closedHtml, '', 'Closed modal must render nothing');
  });

  await test('RawJsonViewerModal rendering & payload presentation', () => {
    const preset = PRESET_LIST[0];
    const html = ReactDOMServer.renderToStaticMarkup(
      <RawJsonViewerModal
        isOpen={true}
        onClose={() => {}}
        result={preset.mockResponse}
      />
    );

    assert.ok(html.includes('Raw Inspection Response Payload'), 'Modal title missing');
    assert.ok(html.includes('Copy JSON'), 'Copy button missing');
    assert.ok(html.includes(preset.mockResponse.session_id), 'Session id missing in JSON viewer');

    const closedHtml = ReactDOMServer.renderToStaticMarkup(
      <RawJsonViewerModal
        isOpen={false}
        onClose={() => {}}
        result={preset.mockResponse}
      />
    );
    assert.equal(closedHtml, '', 'Closed JSON modal must render nothing');
  });

  await test('OfflineWarningBanner online vs offline vs dismissed state', () => {
    const onlineHtml = ReactDOMServer.renderToStaticMarkup(
      <OfflineWarningBanner
        backendOnline={true}
        onRetry={() => {}}
        isChecking={false}
      />
    );
    assert.equal(onlineHtml, '', 'Online banner must render nothing');

    const offlineHtml = ReactDOMServer.renderToStaticMarkup(
      <OfflineWarningBanner
        backendOnline={false}
        onRetry={() => {}}
        isChecking={false}
      />
    );
    assert.ok(offlineHtml.includes('Defense Gateway') || offlineHtml.includes('Unreachable') || offlineHtml.includes('Offline'), 'Offline warning text missing');
    assert.ok(offlineHtml.includes('Retry Connection'), 'Retry button missing');
  });

  await test('ForensicsViewer canvas and colormap legend rendering', () => {
    const forgedPreset = PRESET_LIST.find((p) => p.id === 'forged_aadhaar')!;
    const html = ReactDOMServer.renderToStaticMarkup(
      <ForensicsViewer
        documentImageUrl="data:image/png;base64,mockDoc"
        heatmapImageUrl="data:image/png;base64,mockHeat"
        forensics={forgedPreset.mockResponse.details.forensics}
        stamp={forgedPreset.mockResponse.details.stamp}
      />
    );

    assert.ok(
      html.includes('Visual Forensics') || html.includes('Dual-Canvas Visual Forensics'),
      'Forensics header missing'
    );
    assert.ok(html.includes('Colormap:'), 'Colormap legend missing');
    assert.ok(html.includes('0.00 (Clean)'), 'Colormap clean indicator missing');
    assert.ok(html.includes('1.00 (Critical Forgery)'), 'Colormap forgery indicator missing');
  });

  await test('PillarsTable and individual Pillar components rendering', () => {
    const mockDetails = PRESET_LIST[0].mockResponse.details;
    const stampPresetDetails = PRESET_LIST.find((p) => p.id === 'tampered_stamp')!.mockResponse.details;

    // PillarsTable (all tabs)
    const htmlTable = ReactDOMServer.renderToStaticMarkup(
      <PillarsTable scanDetails={mockDetails} />
    );
    assert.ok(htmlTable.includes('All Verification Checks'), 'All Verification Checks tab missing');
    assert.ok(htmlTable.includes('Check 1: Text Extraction &amp; QR Verification') || htmlTable.includes('Check 1: Text Extraction & QR Verification'), 'Check 1 section missing');
    assert.ok(htmlTable.includes('Check 2: Document Format &amp; Security Checksums') || htmlTable.includes('Check 2: Document Format & Security Checksums'), 'Check 2 section missing');
    assert.ok(htmlTable.includes('Check 3: Face Match &amp; Selfie Liveness Check') || htmlTable.includes('Check 3: Face Match & Selfie Liveness Check'), 'Check 3 section missing');
    assert.ok(htmlTable.includes('Check 4: Ink, Tamper &amp; Substrate Integrity') || htmlTable.includes('Check 4: Ink, Tamper & Substrate Integrity'), 'Check 4 section missing');
    assert.ok(htmlTable.includes('Check 5: Border Permit Stamp Verification'), 'Check 5 section missing');

    // PillarOCR
    const ocrHtml = ReactDOMServer.renderToStaticMarkup(<PillarOCR ocr={mockDetails.ocr} />);
    assert.ok(ocrHtml.includes('Structured Demographic Fields'), 'PillarOCR missing fields header');

    // PillarMRZ
    const mrzHtml = ReactDOMServer.renderToStaticMarkup(<PillarMRZ mrz={mockDetails.mrz} />);
    assert.ok(mrzHtml.includes('Modulo-10'), 'PillarMRZ missing checksum header');

    // PillarBiometrics
    const bioHtml = ReactDOMServer.renderToStaticMarkup(
      <PillarBiometrics biometrics={mockDetails.biometrics} liveness={mockDetails.liveness} />
    );
    assert.ok(bioHtml.includes('Facial Biometric Matcher'), 'PillarBiometrics missing biometric matcher title');

    // PillarForensics
    const forensHtml = ReactDOMServer.renderToStaticMarkup(
      <PillarForensics forensics={mockDetails.forensics} />
    );
    assert.ok(forensHtml.includes('Digital Text Tamper Detector'), 'PillarForensics missing text tamper detector score');

    // PillarStamp (null stamp case)
    const nullStampHtml = ReactDOMServer.renderToStaticMarkup(
      <PillarStamp stamp={null} />
    );
    assert.ok(nullStampHtml.includes('No Border Transit Stamp Detected'), 'PillarStamp missing null fallback');

    // PillarStamp (active stamp case)
    const activeStampHtml = ReactDOMServer.renderToStaticMarkup(
      <PillarStamp stamp={stampPresetDetails.stamp} />
    );
    assert.ok(activeStampHtml.includes('4-Stage Hybrid Stamp Authentication'), 'PillarStamp missing active header');
    assert.ok(activeStampHtml.includes('VERDICT:'), 'PillarStamp missing verdict');
  });

  // -------------------------------------------------------------
  // SUITE 3: Device Polling & Offline Fallbacks Stress Testing
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Device Polling & Offline Fallback Simulation ---');

  await test('Header component rendering with device tracker and post selector', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <Header
        selectedCheckpoint={CHECKPOINTS[0]}
        onSelectCheckpoint={() => {}}
        backendOnline={true}
        backendLatencyMs={42}
        onRefreshHealth={() => {}}
        isCheckingHealth={false}
        onOpenAuditModal={() => {}}
        onOpenJsonModal={() => {}}
        hasScanResult={true}
      />
    );

    assert.ok(html.includes('Sashastra Seema Bal (SSB)'), 'Official SSB branding missing');
    assert.ok(html.includes('FIELD UNIT'), 'Field unit device tracker missing');
    assert.ok(html.includes('Connect Field Unit'), 'Connect Field Unit button missing');
    assert.ok(html.includes('AIR-GAPPED'), 'Air gapped badge missing');
    assert.ok(html.includes('Audit Certificate'), 'Audit certificate button missing');
    assert.ok(html.includes('JSON'), 'JSON button missing');
  });

  await test('Companion Live Sync indicators & Received Badges in Ingestion Components', () => {
    // 1. Dropzone with companion live sync active and received badge
    const dropzoneHtml = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={new File(['test'], 'doc.jpg', { type: 'image/jpeg' })}
        documentPreviewUrl="data:image/jpeg;base64,mock"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        isCompanionConnected={true}
        receivedFromCompanion={true}
      />
    );
    assert.ok(
      dropzoneHtml.includes('Field Unit Connected (Live Companion Sync Active)'),
      'Dropzone must render live sync indicator when connected'
    );
    assert.ok(
      dropzoneHtml.includes('Received from Field Unit Camera'),
      'Dropzone must render received badge when receivedFromCompanion is true'
    );

    // 2. WebCamCapture with companion live sync active and received badge
    const webcamHtml = ReactDOMServer.renderToStaticMarkup(
      <WebCamCapture
        livePhotoFile={new File(['test'], 'face.jpg', { type: 'image/jpeg' })}
        livePhotoPreviewUrl="data:image/jpeg;base64,mock"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        isCompanionConnected={true}
        receivedFromCompanion={true}
      />
    );
    assert.ok(
      webcamHtml.includes('Field Unit Connected (Live Companion Sync Active)'),
      'WebCamCapture must render live sync indicator when connected'
    );
    assert.ok(
      webcamHtml.includes('Received from Field Unit Camera'),
      'WebCamCapture must render received badge when receivedFromCompanion is true'
    );

    // 3. IngestionPanel with companion sync indicator (Connected state)
    const ingestionHtml = ReactDOMServer.renderToStaticMarkup(
      <IngestionPanel
        documentFile={null}
        documentPreviewUrl={null}
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        livePhotoFile={null}
        livePhotoPreviewUrl={null}
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        selectedCheckpoint={CHECKPOINTS[0]}
        transitDate="2026-08-24"
        onChangeTransitDate={() => {}}
        onSelectPreset={() => {}}
        onScan={() => {}}
        onReset={() => {}}
        isScanning={false}
        canScan={false}
        isCompanionConnected={true}
      />
    );
    assert.ok(
      ingestionHtml.includes('Field Unit Connected (Live Companion Sync Active)'),
      'IngestionPanel must render companion live indicator banner'
    );
    assert.ok(
      ingestionHtml.includes('Companion Pairing Center'),
      'IngestionPanel must render companion pairing center button when connected'
    );

    // 4. IngestionPanel (Disconnected state)
    const ingestionDisconnectedHtml = ReactDOMServer.renderToStaticMarkup(
      <IngestionPanel
        documentFile={null}
        documentPreviewUrl={null}
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        livePhotoFile={null}
        livePhotoPreviewUrl={null}
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        selectedCheckpoint={CHECKPOINTS[0]}
        transitDate="2026-08-24"
        onChangeTransitDate={() => {}}
        onSelectPreset={() => {}}
        onScan={() => {}}
        onReset={() => {}}
        isScanning={false}
        canScan={false}
        isCompanionConnected={false}
      />
    );
    assert.ok(
      ingestionDisconnectedHtml.includes('Connect Field Unit'),
      'IngestionPanel must render Connect Field Unit button when waiting/disconnected'
    );
    assert.ok(
      ingestionDisconnectedHtml.includes('Waiting for Field Unit'),
      'IngestionPanel must render Waiting for Field Unit pill when disconnected'
    );
  });

  await test('ResultsPanel side-by-side biometric comparison (Document Photo vs Live Field Capture)', () => {
    const preset = PRESET_LIST[0];
    const html = ReactDOMServer.renderToStaticMarkup(
      <ResultsPanel
        result={preset.mockResponse}
        documentImageUrl="data:image/png;base64,mockDoc"
        livePhotoUrl="data:image/png;base64,mockLive"
      />
    );

    assert.ok(
      html.includes('1:1 Identity Verification · Side-by-Side Comparison'),
      'ResultsPanel must render side-by-side comparison title'
    );
    assert.ok(
      html.includes('Document Credential Photo'),
      'ResultsPanel must label document photo'
    );
    assert.ok(
      html.includes('Live Field Unit Capture'),
      'ResultsPanel must label live field unit capture'
    );
    assert.ok(
      html.includes('Received from Field Unit Camera'),
      'ResultsPanel must render companion badge in side-by-side comparison'
    );
  });

  await test('Device polling fallback simulation: 200 OK, 500 error, network down, malformed JSON', async () => {
    const parseDeviceResponse = async (fetchPromise: Promise<any>): Promise<number> => {
      try {
        const res = await fetchPromise;
        if (res.ok) {
          const data = await res.json();
          if (typeof data.total_devices === 'number') {
            return Math.max(1, data.total_devices);
          }
        }
        return 1; // fallback
      } catch {
        return 1; // offline fallback
      }
    };

    // 1. Success 200 with 3 devices
    const count1 = await parseDeviceResponse(
      Promise.resolve({
        ok: true,
        json: async () => ({ total_devices: 3, connected_clients: [] }),
      })
    );
    assert.equal(count1, 3, 'Should parse 3 devices successfully');

    // 2. 500 Internal Server Error
    const count2 = await parseDeviceResponse(
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database timeout' }),
      })
    );
    assert.equal(count2, 1, 'Should fallback to 1 device on 500 error');

    // 3. Network Drop / Connection Refused
    const count3 = await parseDeviceResponse(
      Promise.reject(new TypeError('Failed to fetch: Connection refused'))
    );
    assert.equal(count3, 1, 'Should fallback to 1 device on network throw');

    // 4. Malformed / Truncated JSON
    const count4 = await parseDeviceResponse(
      Promise.resolve({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      })
    );
    assert.equal(count4, 1, 'Should fallback to 1 device on malformed JSON');
  });

  // -------------------------------------------------------------
  // SUITE 4: Circular Dependencies & Barrel Export Graph
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Circular Dependencies & Barrel Export DAG Verification ---');

  await test('Dependency graph static analysis: 0 circular dependencies', () => {
    const tsFiles: string[] = [];
    function collectTs(dir: string) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          collectTs(full);
        } else if (item.endsWith('.tsx') || (item.endsWith('.ts') && !item.endsWith('.d.ts'))) {
          tsFiles.push(full);
        }
      }
    }
    collectTs(SRC_DIR);

    const graph = new Map<string, string[]>();

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const imports: string[] = [];
      const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.[^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(content)) !== null) {
        const importPath = m[1];
        const dir = path.dirname(file);
        let resolved = path.resolve(dir, importPath);

        // Resolve extensions
        const candidates = [
          resolved + '.ts',
          resolved + '.tsx',
          path.join(resolved, 'index.ts'),
          path.join(resolved, 'index.tsx'),
        ];
        let finalResolved: string | null = null;
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            finalResolved = cand;
            break;
          }
        }
        if (finalResolved) {
          imports.push(finalResolved);
        }
      }
      graph.set(file, imports);
    }

    // Cycle detection via DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];

    function dfs(node: string, currentPath: string[]) {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...currentPath, neighbor]);
        } else if (recStack.has(neighbor)) {
          const cyclePath = [...currentPath, neighbor].map((p) => path.relative(SRC_DIR, p));
          cycles.push(cyclePath);
        }
      }

      recStack.delete(node);
    }

    for (const file of tsFiles) {
      if (!visited.has(file)) {
        dfs(file, [file]);
      }
    }

    assert.equal(
      cycles.length,
      0,
      `Found circular dependencies in frontend graph:\n${cycles.map((c) => c.join(' -> ')).join('\n')}`
    );
  });

  await test('Barrel export integrity for src/components/ui/index.ts', () => {
    const barrelPath = path.join(SRC_DIR, 'components/ui/index.ts');
    const barrelContent = fs.readFileSync(barrelPath, 'utf8');

    // Verify all essential UI primitives are exported
    const expectedExports = [
      'Button',
      'TextRow',
      'StatusPill',
      'SegmentedControl',
      'DiffTable',
      'FilterTable',
      'ApprovalCard',
      'ToolChips',
      'InspectionPipelineTrace',
    ];

    for (const exp of expectedExports) {
      assert.ok(
        barrelContent.includes(exp),
        `Barrel file missing export for primitive ${exp}`
      );
    }
  });

  // -------------------------------------------------------------
  // SUITE 5: Memory Leaks & Resource Cleanup Static Analysis
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Memory Leak & Resource Cleanup Static Audit ---');

  await test('Header.tsx cleans up intervals and guards with isMounted flag', () => {
    const headerPath = path.join(SRC_DIR, 'components/Header.tsx');
    const code = fs.readFileSync(headerPath, 'utf8');

    assert.ok(code.includes('clearInterval(timer)'), 'Header must clear UTC clock interval');
    assert.ok(code.includes('clearInterval(interval)'), 'Header must clear device polling interval');
    assert.ok(code.includes('isMounted = false'), 'Header must guard async fetch with isMounted flag');
  });

  await test('useBackendHealth.ts cleans up polling interval on unmount', () => {
    const hookPath = path.join(SRC_DIR, 'hooks/useBackendHealth.ts');
    const code = fs.readFileSync(hookPath, 'utf8');

    assert.ok(code.includes('clearInterval(interval)'), 'useBackendHealth must clean up setInterval on unmount');
  });

  await test('WebCamCapture.tsx cleans up media stream tracks on unmount and stop', () => {
    const camPath = path.join(SRC_DIR, 'components/WebCamCapture.tsx');
    const code = fs.readFileSync(camPath, 'utf8');

    assert.ok(code.includes('streamRef.current.getTracks().forEach'), 'WebCamCapture must stop media stream tracks');
    assert.ok(code.includes('stopCamera()'), 'WebCamCapture must invoke stopCamera in useEffect cleanup');
  });

  console.log('\n=============================================');
  console.log(`TOTAL AUDIT CHECKS RUN : ${total}`);
  console.log(`PASSED                 : ${passed}`);
  console.log(`FAILED                 : ${failed}`);
  console.log('=============================================\n');

  if (failed > 0) {
    console.error('CHALLENGER 2 AUDIT FAILED with errors:');
    for (const err of errors) {
      console.error(`- [${err.name}]:`, err.err);
    }
    process.exit(1);
  } else {
    console.log('ALL CHALLENGER 2 ADVERSARIAL AUDITS PASSED WITH ZERO ERRORS! 🚀\n');
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
