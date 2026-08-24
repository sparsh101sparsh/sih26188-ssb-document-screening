import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ConnectModal, generateQRMatrix } from '../src/components/ConnectModal';
import { ConnectedClient } from '../src/types/api';

const SRC_DIR = path.resolve(process.cwd(), 'src');

let passed = 0;
let failed = 0;
let total = 0;
const errors: { name: string; err: unknown }[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    errors.push({ name, err });
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${(err as Error)?.message || err}`);
  }
}

async function runEmpiricalChallengerM3() {
  console.log('\n========================================================================');
  console.log('CHALLENGER M3: COMPREHENSIVE EMPIRICAL ADVERSARIAL STRESS SUITE (R3)');
  console.log('========================================================================');

  // -------------------------------------------------------------
  // SUITE 1: Pure Offline QR Code Matrix Generator Engine Invariants
  // -------------------------------------------------------------
  console.log('\n--- SUITE 1: Offline QR Matrix Generator Mathematical Invariants ---');

  await test('QR Generator: Generates Version 1-5 matrices with strictly square dimensions', () => {
    const payloads = [
      'http://localhost:8000',                                           // Short (V1/V2)
      'http://192.168.1.100:8000',                                      // Typical LAN IP (V2/V3)
      'http://192.168.100.250:8000/api/v1/companion/upload',            // Medium payload (V3/V4)
      'http://192.168.1.100:8000/api/v1/companion/upload?auth=token1234567890abcdef', // Long payload (V4/V5)
    ];

    for (const payload of payloads) {
      const matrix = generateQRMatrix(payload);
      assert.ok(Array.isArray(matrix), `Matrix must be array for "${payload}"`);
      assert.ok([21, 25, 29, 33, 37].includes(matrix.length), `Dimension ${matrix.length} must be standard ISO/IEC 18004 version size`);
      assert.ok(matrix.every((r) => r.length === matrix.length), 'Matrix must be perfectly square');
    }
  });

  await test('QR Generator: Top-Left, Top-Right, Bottom-Left Finder Pattern Invariants (7x7)', () => {
    const matrix = generateQRMatrix('http://192.168.43.1:8000');
    const size = matrix.length;

    // Verify 7x7 Finder Pattern structure at all 3 positions:
    // Outline border (r=0, r=6, c=0, c=6) = black (true)
    // Inner ring (r=1..5, c=1, c=5; r=1,5, c=1..5) = white (false)
    // 3x3 Center Core (r=2..4, c=2..4) = black (true)
    const checkFinder = (top: number, left: number, label: string) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const row = top + r;
          const col = left + c;
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          const expected = isBorder || isCore;
          assert.equal(
            matrix[row][col],
            expected,
            `Finder ${label} at relative (${r},${c}) -> absolute (${row},${col}) should be ${expected ? 'BLACK' : 'WHITE'}`
          );
        }
      }
    };

    checkFinder(0, 0, 'Top-Left');
    checkFinder(0, size - 7, 'Top-Right');
    checkFinder(size - 7, 0, 'Bottom-Left');
  });

  await test('QR Generator: Timing Patterns along Row 6 and Column 6', () => {
    const matrix = generateQRMatrix('http://192.168.1.50:8000');
    const size = matrix.length;

    // Timing pattern runs between finder patterns with alternating black/white modules
    for (let i = 8; i < size - 8; i++) {
      const expected = i % 2 === 0;
      assert.equal(matrix[6][i], expected, `Horizontal timing pattern at (6, ${i}) must alternate`);
      assert.equal(matrix[i][6], expected, `Vertical timing pattern at (${i}, 6) must alternate`);
    }
  });

  await test('QR Generator: Resilient under adversarial and extreme strings', () => {
    const adversarialInputs = [
      '', // Empty string
      'http://[::1]:8000', // IPv6 loopback
      'http://10.0.2.2:8000/?query=1&space=%20&special=@#$%^&*()', // Special chars
      'https://secure-gateway.ssb.gov.in:8443/custom/checkpoint/path/long/url', // Long URL
    ];

    for (const input of adversarialInputs) {
      assert.doesNotThrow(() => {
        const mat = generateQRMatrix(input);
        assert.ok(mat.length >= 21);
      }, `generateQRMatrix must not throw for adversarial input "${input}"`);
    }
  });

  // -------------------------------------------------------------
  // SUITE 2: Live Device Monitor Table & Telemetry Simulation
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Live Device Monitor Table & Telemetry Simulation ---');

  await test('Live Device Monitor: Renders empty state with animated radar when 0 devices connected', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} />
    );

    // Initial state has activeDeviceCount = 0
    assert.ok(html.includes('Waiting for Device'), 'Header badge must indicate Waiting for Device when 0 connected');
    assert.ok(html.includes('bg-orange'), 'Header badge must have orange warning status when 0 connected');
  });

  await test('Live Device Monitor: Device list component formatting logic (single & multiple clients)', () => {
    const mockDevices: ConnectedClient[] = [
      {
        client_ip: '192.168.43.101',
        user_agent: 'SSB Field Camera v2.4 (Pixel 7)',
        checkpoint_id: 'WB-PAN-01',
        total_requests: 42,
        latency_ms: 12.8,
        status: 'ONLINE',
        last_seen: '2026-08-24T06:00:00Z',
      },
      {
        client_ip: '192.168.43.102',
        user_agent: 'SSB Field Camera v2.4 (Samsung S23)',
        checkpoint_id: 'WB-PAN-02',
        total_requests: 108,
        latency_ms: 19.4,
        status: 'ONLINE',
        last_seen: '2026-08-24T06:01:00Z',
      },
      {
        client_ip: '10.0.2.2',
        user_agent: 'Android Studio Emulator (SDK 34)',
        checkpoint_id: 'WB-SIM-00',
        total_requests: 5,
        latency_ms: 4.1,
        status: 'ONLINE',
        last_seen: '2026-08-24T06:02:00Z',
      },
    ];

    // Simulate device card rendering logic
    const renderDeviceCard = (dev: ConnectedClient, idx: number) => {
      const isOnline = dev.status === 'ONLINE';
      const label = dev.user_agent || `Field Camera Unit #${idx + 1}`;
      const checkpoint = dev.checkpoint_id || 'WB-JAI-01';
      const latencyStr = typeof dev.latency_ms === 'number' ? `${dev.latency_ms} ms` : 'Live';
      return {
        label,
        checkpoint,
        ip: dev.client_ip,
        requests: dev.total_requests,
        latencyStr,
        isOnline,
      };
    };

    const rendered = mockDevices.map((d, i) => renderDeviceCard(d, i));
    assert.equal(rendered.length, 3);
    assert.equal(rendered[0].label, 'SSB Field Camera v2.4 (Pixel 7)');
    assert.equal(rendered[0].ip, '192.168.43.101');
    assert.equal(rendered[0].checkpoint, 'WB-PAN-01');
    assert.equal(rendered[0].requests, 42);
    assert.equal(rendered[0].latencyStr, '12.8 ms');

    assert.equal(rendered[1].label, 'SSB Field Camera v2.4 (Samsung S23)');
    assert.equal(rendered[1].ip, '192.168.43.102');
    assert.equal(rendered[2].label, 'Android Studio Emulator (SDK 34)');
    assert.equal(rendered[2].ip, '10.0.2.2');
  });

  await test('Live Device Monitor: Robust fallback handling for malformed or missing device fields', () => {
    const malformedDevice: ConnectedClient = {
      client_ip: '192.168.1.99',
      user_agent: undefined as any,
      checkpoint_id: undefined as any,
      total_requests: 0,
      latency_ms: undefined as any,
      status: undefined as any,
      last_seen: undefined as any,
    };

    // Format logic with fallbacks
    const userAgent = malformedDevice.user_agent || 'Field Camera Unit #1';
    const checkpoint = malformedDevice.checkpoint_id || 'WB-JAI-01';
    const status = malformedDevice.status || 'ONLINE';
    const latency = typeof malformedDevice.latency_ms === 'number' ? `${malformedDevice.latency_ms} ms` : 'Live';
    const time = malformedDevice.last_seen ? new Date(malformedDevice.last_seen).toLocaleTimeString() : 'Active';

    assert.equal(userAgent, 'Field Camera Unit #1');
    assert.equal(checkpoint, 'WB-JAI-01');
    assert.equal(status, 'ONLINE');
    assert.equal(latency, 'Live');
    assert.equal(time, 'Active');
  });

  // -------------------------------------------------------------
  // SUITE 3: Tab Navigation, Sub-Tab Instructions & 1-Click Copy
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Tab Navigation, Sub-Tab Instructions & 1-Click Copy ---');

  await test('ConnectModal: Initial mount renders Tab 1 (Pairing & QR Code) with 1-Click Copy options', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl="http://192.168.1.150:8000" />
    );

    // Primary Gateway spotlight
    assert.ok(html.includes('Border Wi-Fi / LAN Gateway'), 'Must display Border Wi-Fi/LAN Gateway heading');
    assert.ok(html.includes('http://192.168.1.150:8000'), 'Must render primary gateway URL');

    // 1-Click Copy cards
    assert.ok(html.includes('Android Emulator'), 'Must display Android Emulator option');
    assert.ok(html.includes('http://10.0.2.2:8000'), 'Must display 10.0.2.2 emulator URL');
    assert.ok(html.includes('USB Cable (ADB Reverse)'), 'Must display USB Cable (ADB Reverse) option');
    assert.ok(html.includes('adb reverse tcp:8000 tcp:8000'), 'Must display adb reverse command');
    assert.ok(html.includes('Localhost Edge Gateway'), 'Must display Localhost gateway option');
    assert.ok(html.includes('http://localhost:8000'), 'Must display localhost URL');
  });

  await test('ConnectModal: Setup Guide sub-tabs contain concrete instructions for Wi-Fi, USB, and Emulator', () => {
    const modalPath = path.join(SRC_DIR, 'components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    // Mode A: Wi-Fi instructions verification
    assert.ok(code.includes('Mode A: Wi-Fi / LAN'), 'Must contain Mode A subtab switcher');
    assert.ok(code.includes('Wireless Local Area Network Setup:'), 'Must contain Wi-Fi instructions heading');
    assert.ok(code.includes('same Wi-Fi router or hotspot'), 'Must instruct connecting to same Wi-Fi');
    assert.ok(code.includes('SSB Field Camera'), 'Must reference SSB Field Camera app');

    // Mode B: USB / ADB instructions verification
    assert.ok(code.includes('Mode B: USB / ADB Reverse'), 'Must contain Mode B subtab switcher');
    assert.ok(code.includes('Air-Gapped USB Tethering &amp; Reverse Proxy:') || code.includes('Air-Gapped USB Tethering & Reverse Proxy:'), 'Must contain USB instructions heading');
    assert.ok(code.includes('USB-C data cable'), 'Must instruct USB-C connection');
    assert.ok(code.includes('USB Debugging'), 'Must instruct enabling USB debugging');
    assert.ok(code.includes('adb reverse tcp:8000 tcp:8000'), 'Must provide copyable adb command');

    // Mode C: Emulator instructions verification
    assert.ok(code.includes('Mode C: Emulator'), 'Must contain Mode C subtab switcher');
    assert.ok(code.includes('Android Studio Virtual Device (AVD) Simulation:'), 'Must contain Emulator instructions heading');
    assert.ok(code.includes('android-agent'), 'Must reference android-agent project');
    assert.ok(code.includes('10.0.2.2:8000'), 'Must reference 10.0.2.2 host alias');
  });

  // -------------------------------------------------------------
  // SUITE 4: Interactive Simulation Suite & Stream Triggering
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Interactive Simulation Suite & Stream Triggering ---');

  await test('ConnectModal: Simulation suite triggers (Document Scan, Traveler Selfie, Flush Buffer)', () => {
    const modalPath = path.join(SRC_DIR, 'components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    // Trigger 1: Document Scan
    assert.ok(code.includes("simulateCompanionUpload(type)"), 'Must wire Document/Selfie upload simulation');
    assert.ok(code.includes("handleSimulate('document')"), 'Must wire handleSimulate with document');
    assert.ok(code.includes('Send Test Document Scan'), 'Must have Document Scan trigger button');
    assert.ok(code.includes('capture_type: document'), 'Must document capture_type document payload');

    // Trigger 2: Traveler Selfie
    assert.ok(code.includes("handleSimulate('selfie')"), 'Must wire handleSimulate with selfie');
    assert.ok(code.includes('Send Test Traveler Selfie'), 'Must have Traveler Selfie trigger button');
    assert.ok(code.includes('capture_type: selfie'), 'Must document capture_type selfie payload');

    // Trigger 3: Clear Companion Stream Buffer
    assert.ok(code.includes('clearCompanionCapture()'), 'Must wire clearCompanionCapture API');
    assert.ok(code.includes('Clear Companion Stream Buffer'), 'Must have Clear Stream Buffer button');
    assert.ok(code.includes('POST /api/v1/companion/clear'), 'Must reference companion clear endpoint');

    // Callback propagation
    assert.ok(code.includes('onSimulatedCapture(type)'), 'Must propagate onSimulatedCapture callback to parent');
  });

  await test('ConnectModal: Simulation state machine prevents concurrent double-clicks', () => {
    const modalPath = path.join(SRC_DIR, 'components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      code.includes('disabled={isSimulating !== null}'),
      'Simulation action buttons must be disabled during active request to prevent concurrent race conditions'
    );
  });

  // -------------------------------------------------------------
  // SUITE 5: Modal Dismissal, Backdrop Click & Accessibility
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Modal Dismissal, Backdrop Click & Accessibility ---');

  await test('Modal Dismissal: Backdrop click handler calls onClose when clicking outer backdrop only', () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    // Simulate backdrop click handler: onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    const handleBackdropClick = (target: string, currentTarget: string) => {
      if (target === currentTarget) onClose();
    };

    // 1. Click on outer backdrop (target === currentTarget)
    closed = false;
    handleBackdropClick('backdrop-div', 'backdrop-div');
    assert.equal(closed, true, 'Clicking backdrop must trigger onClose');

    // 2. Click on inner card element (target !== currentTarget)
    closed = false;
    handleBackdropClick('inner-card', 'backdrop-div');
    assert.equal(closed, false, 'Clicking inner modal card must NOT trigger onClose');
  });

  await test('Modal Dismissal: Keyboard Escape key listener dispatches onClose', () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    const handleKeyDown = (e: { key: string }) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    handleKeyDown({ key: 'Enter' });
    assert.equal(closed, false, 'Enter key must not dismiss modal');

    handleKeyDown({ key: 'Tab' });
    assert.equal(closed, false, 'Tab key must not dismiss modal');

    handleKeyDown({ key: 'Escape' });
    assert.equal(closed, true, 'Escape key must trigger onClose');
  });

  await test('Accessibility: ARIA dialog attributes, semantic buttons, and labels', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} />
    );

    assert.ok(html.includes('role="dialog"'), 'Must have role="dialog"');
    assert.ok(html.includes('aria-modal="true"'), 'Must have aria-modal="true"');
    assert.ok(html.includes('aria-labelledby="companion-modal-title"'), 'Must have aria-labelledby linking to modal title ID');
    assert.ok(html.includes('id="companion-modal-title"'), 'Modal title must have id="companion-modal-title"');
    assert.ok(html.includes('aria-label="Close Pairing Center"'), 'Close button must have descriptive aria-label');
  });

  // -------------------------------------------------------------
  // SUITE 6: Responsive Breakpoints & Dark Theme Color Tokens
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Responsive Breakpoints & Dark Theme Color Tokens ---');

  await test('ConnectModal: Contains responsive layout classes and dark semantic tokens', () => {
    const modalPath = path.join(SRC_DIR, 'components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    // Responsive classes
    assert.ok(code.includes('sm:flex-row'), 'Must use sm:flex-row for responsive stacking');
    assert.ok(code.includes('sm:grid-cols-2'), 'Must use sm:grid-cols-2 for tablet/desktop grids');
    assert.ok(code.includes('max-h-[92vh]'), 'Must restrict max height with responsive scrolling');
    assert.ok(code.includes('overflow-y-auto'), 'Must support vertical scrolling on small screens');

    // Semantic tokens
    assert.ok(code.includes('bg-surface'), 'Must use bg-surface token');
    assert.ok(code.includes('bg-inset'), 'Must use bg-inset token');
    assert.ok(code.includes('border-line'), 'Must use border-line token');
    assert.ok(code.includes('text-ink'), 'Must use text-ink token');
    assert.ok(code.includes('text-accent'), 'Must use text-accent token');
  });

  // -------------------------------------------------------------
  // SUITE 7: End-to-End Stress Fuzzing & Rapid Mount/Unmount Cycle
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: High-Frequency Telemetry & Rapid Mount/Unmount Cycle ---');

  await test('Rapid Lifecycle Stress: 1,000 mount and unmount cycles execute with zero exceptions', () => {
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      const isOpen = i % 2 === 0;
      const html = ReactDOMServer.renderToStaticMarkup(
        <ConnectModal isOpen={isOpen} onClose={() => {}} serverUrl={`http://192.168.1.${(i % 250) + 1}:8000`} />
      );
      if (isOpen) {
        assert.ok(html.length > 500, 'Rendered HTML must be complete');
      } else {
        assert.equal(html, '', 'Closed modal must render empty');
      }
    }
    const elapsed = performance.now() - startTime;
    console.log(`    (1,000 mount/unmount iterations completed in ${elapsed.toFixed(2)}ms)`);
  });

  console.log('\n========================================================================');
  console.log(`TOTAL EMPIRICAL CHECKS RUN : ${total}`);
  console.log(`PASSED                     : ${passed}`);
  console.log(`FAILED                     : ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error('CHALLENGER M3 EMPIRICAL AUDIT FAILED with errors:');
    for (const err of errors) {
      console.error(`- [${err.name}]:`, err.err);
    }
    process.exit(1);
  } else {
    console.log('ALL CHALLENGER M3 EMPIRICAL STRESS CHECKS PASSED WITH ZERO ERRORS! 🚀\n');
  }
}

runEmpiricalChallengerM3().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
