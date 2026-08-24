import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ConnectModal, generateQRMatrix } from '../src/components/ConnectModal';
import { simulateCompanionUpload, clearCompanionCapture, getCompanionInfo } from '../src/services/api';

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

async function runAll() {
  console.log('\n========================================================================');
  console.log('ADVERSARIAL CHALLENGER M3: EMPIRICAL STRESS & HARNESS VERIFICATION SUITE');
  console.log('========================================================================');

  // =========================================================================
  // SUITE 1: QR Code Generator Matrix & SVG Rendering Under Varied URL Lengths
  // =========================================================================
  console.log('\n--- SUITE 1: QR Code Matrix & SVG Rendering Stress Test ---');

  await test('QR Matrix: Version 1 (Short URL <= 19 bytes) produces 21x21 matrix with valid format & finders', () => {
    const url = 'http://a:80'; // 11 bytes -> Version 1
    const matrix = generateQRMatrix(url);

    assert.equal(matrix.length, 21, 'Version 1 matrix size must be 21');
    assert.equal(matrix[0].length, 21, 'Version 1 matrix rows must be 21');

    // Finder Top-Left
    assert.equal(matrix[0][0], true);
    assert.equal(matrix[0][6], true);
    assert.equal(matrix[6][0], true);
    assert.equal(matrix[6][6], true);
    assert.equal(matrix[3][3], true);
    assert.equal(matrix[1][1], false);

    // Finder Top-Right
    assert.equal(matrix[0][14], true);
    assert.equal(matrix[0][20], true);
    assert.equal(matrix[6][14], true);
    assert.equal(matrix[6][20], true);

    // Finder Bottom-Left
    assert.equal(matrix[14][0], true);
    assert.equal(matrix[20][0], true);
    assert.equal(matrix[14][6], true);
    assert.equal(matrix[20][6], true);

    // Dark Module at (size - 8, 8) -> (13, 8)
    assert.equal(matrix[13][8], true, 'Dark module at (13, 8) must be true');
  });

  await test('QR Matrix: Version 2 (20-34 bytes) produces 25x25 matrix with alignment pattern at (18, 18)', () => {
    const url = 'http://192.168.1.105:8000'; // 25 bytes -> Version 2
    const matrix = generateQRMatrix(url);

    assert.equal(matrix.length, 25, 'Version 2 matrix size must be 25');
    assert.equal(matrix[0].length, 25, 'Version 2 matrix rows must be 25');

    // Alignment pattern center at (18, 18)
    assert.equal(matrix[18][18], true, 'Alignment pattern center must be black');
    // Surrounding white ring (17, 18), (19, 18), (18, 17), (18, 19)
    assert.equal(matrix[17][18], false, 'Alignment inner ring top must be white');
    assert.equal(matrix[19][18], false, 'Alignment inner ring bottom must be white');
    assert.equal(matrix[18][17], false, 'Alignment inner ring left must be white');
    assert.equal(matrix[18][19], false, 'Alignment inner ring right must be white');
    // Outer black border (16, 16) to (20, 20)
    assert.equal(matrix[16][16], true, 'Alignment outer corner must be black');
    assert.equal(matrix[20][20], true, 'Alignment outer corner must be black');
  });

  await test('QR Matrix: Version 3 (35-55 bytes) produces 29x29 matrix with alignment pattern at (22, 22)', () => {
    const url = 'http://192.168.100.250:8000/api/v1/companion'; // 44 bytes -> Version 3
    const matrix = generateQRMatrix(url);

    assert.equal(matrix.length, 29, 'Version 3 matrix size must be 29');
    assert.equal(matrix[0].length, 29, 'Version 3 matrix rows must be 29');
    assert.equal(matrix[22][22], true, 'Alignment center at (22, 22) must be black');
  });

  await test('QR Matrix: Version 4 (56-80 bytes) produces 33x33 matrix', () => {
    const url = 'http://192.168.100.250:8000/api/v1/companion/upload?checkpoint_id=WB-JAI-01'; // 75 bytes -> Version 4
    const matrix = generateQRMatrix(url);

    assert.equal(matrix.length, 33, 'Version 4 matrix size must be 33');
    assert.equal(matrix[0].length, 33, 'Version 4 matrix rows must be 33');
    assert.equal(matrix[26][26], true, 'Alignment center at (26, 26) must be black');
  });

  await test('QR Matrix: Version 5 (81-108 bytes) produces 37x37 matrix', () => {
    const url = 'http://192.168.100.250:8000/api/v1/companion/upload?checkpoint_id=WB-JAI-01&token=992837482910398471'; // 99 bytes -> Version 5
    const matrix = generateQRMatrix(url);

    assert.equal(matrix.length, 37, 'Version 5 matrix size must be 37');
    assert.equal(matrix[0].length, 37, 'Version 5 matrix rows must be 37');
    assert.equal(matrix[30][30], true, 'Alignment center at (30, 30) must be black');
  });

  await test('QR Matrix: Extreme lengths (>108 bytes) and empty string handle gracefully without crashing', () => {
    // Empty string
    const emptyMatrix = generateQRMatrix('');
    assert.equal(emptyMatrix.length, 21, 'Empty string must default to Version 1 (21x21)');

    // Very long string
    const longUrl = 'http://192.168.1.1:8000/' + 'x'.repeat(200);
    const longMatrix = generateQRMatrix(longUrl);
    assert.equal(longMatrix.length, 37, 'Long string must safely fallback to Version 5 (37x37)');
    assert.equal(longMatrix[0][0], true, 'Finder patterns must remain intact');
  });

  await test('ConnectModal SVG QR Renderer dynamically matches QR matrix dimensions', () => {
    const v1Url = 'http://a:80'; // 11 bytes -> Version 1 (21x21)
    const htmlV1 = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={v1Url} />
    );
    assert.ok(htmlV1.includes('viewBox="0 0 21 21"'), 'V1 URL (11 bytes) must render 21x21 viewBox');
    assert.ok(htmlV1.includes(`aria-label="QR Code for ${v1Url}"`), 'Must include aria-label');

    const v2Url = 'http://10.0.0.1:80'; // 18 bytes (+3 overhead = 21 > 19) -> Version 2 (25x25)
    const htmlV2 = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={v2Url} />
    );
    assert.ok(htmlV2.includes('viewBox="0 0 25 25"'), 'V2 URL (18 bytes) must render 25x25 viewBox');

    const longUrl = 'http://192.168.100.250:8000/api/v1/companion/upload?checkpoint_id=WB-JAI-01';
    const htmlLong = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={longUrl} />
    );
    assert.ok(htmlLong.includes('viewBox="0 0 33 33"'), 'Long URL must render 33x33 viewBox');
  });

  // =========================================================================
  // SUITE 2: 1-Click Copy Options & Clipboard Integration Simulation
  // =========================================================================
  console.log('\n--- SUITE 2: 1-Click Copy Options & Feedback Simulation ---');

  await test('ConnectModal renders all 4 1-click copy targets with correct values', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl="http://192.168.1.55:8000" />
    );

    // 1. Primary LAN Gateway
    assert.ok(html.includes('http://192.168.1.55:8000'), 'Must render primary LAN gateway URL');
    // 2. Android Emulator Loopback
    assert.ok(html.includes('http://10.0.2.2:8000'), 'Must render emulator loopback URL');
    // 3. ADB Reverse Tethering Command
    assert.ok(html.includes('adb reverse tcp:8000 tcp:8000'), 'Must render ADB reverse command');
    // 4. Localhost Edge Gateway
    assert.ok(html.includes('http://localhost:8000'), 'Must render localhost URL');
  });

  await test('Clipboard Copy State Machine: copies string, sets copiedKey, and resets after timeout', async () => {
    let copiedText = '';
    const mockClipboard = {
      writeText: async (text: string) => {
        copiedText = text;
      },
    };

    // State simulation
    let copiedKey: string | null = null;
    const isMounted = { current: true };

    const handleCopy = (text: string, key: string) => {
      mockClipboard.writeText(text);
      copiedKey = key;
      setTimeout(() => {
        if (isMounted.current) copiedKey = null;
      }, 50);
    };

    // Test LAN Gateway copy
    handleCopy('http://192.168.1.55:8000', 'gateway');
    assert.equal(copiedText, 'http://192.168.1.55:8000');
    assert.equal(copiedKey, 'gateway');

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(copiedKey, null, 'copiedKey must reset to null after timeout');

    // Test ADB Reverse command copy
    handleCopy('adb reverse tcp:8000 tcp:8000', 'adb');
    assert.equal(copiedText, 'adb reverse tcp:8000 tcp:8000');
    assert.equal(copiedKey, 'adb');

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(copiedKey, null, 'copiedKey must reset to null after timeout');

    // Test unmounted safety guard
    isMounted.current = false;
    handleCopy('http://10.0.2.2:8000', 'emu');
    copiedKey = 'emu';
    await new Promise((r) => setTimeout(r, 60));
    // Since isMounted is false, timeout handler won't overwrite state or throw
    assert.equal(copiedText, 'http://10.0.2.2:8000');
  });

  // =========================================================================
  // SUITE 3: Simulation Triggers & Ingestion Payloads
  // =========================================================================
  console.log('\n--- SUITE 3: Simulation Triggers & Stream Ingestion Harness ---');

  await test('simulateCompanionUpload sends proper payload for "document" capture', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = '';
    let interceptedOptions: any = null;

    globalThis.fetch = (async (url: string, opts: any) => {
      interceptedUrl = url;
      interceptedOptions = opts;
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Simulated document capture delivered to workstation',
          sequence_id: 42,
          capture_type: 'document',
          device_id: 'Android-Pixel-7 (Field Unit #01)',
          checkpoint_id: 'SSB-WB-JAI-01',
          filename: 'simulated_document_12345.jpg',
          timestamp: 1724480000,
        }),
      } as any;
    }) as any;

    try {
      const res = await simulateCompanionUpload('document', 'TestDevice-01', 'WB-JAI-01');
      assert.ok(interceptedUrl.endsWith('/api/v1/companion/simulate'), 'Must target /api/v1/companion/simulate');
      assert.equal(interceptedOptions.method, 'POST');
      assert.equal(interceptedOptions.headers['Content-Type'], 'application/json');

      const body = JSON.parse(interceptedOptions.body);
      assert.equal(body.capture_type, 'document');
      assert.equal(body.device_id, 'TestDevice-01');
      assert.equal(body.checkpoint_id, 'WB-JAI-01');

      assert.equal(res.status, 'success');
      assert.equal(res.capture_type, 'document');
      assert.equal(res.sequence_id, 42);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test('simulateCompanionUpload sends proper payload for "selfie" capture', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = '';
    let interceptedOptions: any = null;

    globalThis.fetch = (async (url: string, opts: any) => {
      interceptedUrl = url;
      interceptedOptions = opts;
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Simulated selfie capture delivered to workstation',
          sequence_id: 43,
          capture_type: 'selfie',
          device_id: 'Android-Pixel-7 (Field Unit #01)',
          checkpoint_id: 'SSB-WB-JAI-01',
          filename: 'simulated_selfie_12345.jpg',
          timestamp: 1724480000,
        }),
      } as any;
    }) as any;

    try {
      const res = await simulateCompanionUpload('selfie');
      assert.ok(interceptedUrl.endsWith('/api/v1/companion/simulate'));
      assert.equal(interceptedOptions.method, 'POST');

      const body = JSON.parse(interceptedOptions.body);
      assert.equal(body.capture_type, 'selfie');
      assert.equal(res.capture_type, 'selfie');
      assert.equal(res.sequence_id, 43);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test('clearCompanionCapture dispatches POST to /api/v1/companion/clear', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = '';
    let interceptedMethod = '';

    globalThis.fetch = (async (url: string, opts: any) => {
      interceptedUrl = url;
      interceptedMethod = opts?.method;
      return {
        ok: true,
        json: async () => ({ status: 'cleared' }),
      } as any;
    }) as any;

    try {
      await clearCompanionCapture();
      assert.ok(interceptedUrl.endsWith('/api/v1/companion/clear'), 'Must call /api/v1/companion/clear');
      assert.equal(interceptedMethod, 'POST');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test('Simulation State Machine: handles loading lock, callbacks, success messages, and error recovery', async () => {
    let isSimulating: string | null = null;
    let simSuccessMsg: string | null = null;
    let callbackTriggered: string | null = null;

    const onSimulatedCapture = (type: 'document' | 'selfie') => {
      callbackTriggered = type;
    };

    const handleSimulate = async (type: 'document' | 'selfie', fail = false) => {
      if (isSimulating !== null) return; // Locked
      isSimulating = type;
      simSuccessMsg = null;
      try {
        if (fail) throw new Error('Network error simulated');
        simSuccessMsg =
          type === 'document'
            ? '✓ Test Document Scan ingested! Slotted into Document Viewport.'
            : '✓ Test Traveler Selfie ingested! Live photo screening triggered.';
        if (onSimulatedCapture) onSimulatedCapture(type);
      } catch {
        // error caught
      } finally {
        isSimulating = null;
      }
    };

    // 1. Successful Document Simulation
    await handleSimulate('document');
    assert.equal(isSimulating, null, 'Must unlock after completion');
    assert.equal(callbackTriggered, 'document', 'Callback must be called with document');
    assert.equal(simSuccessMsg, '✓ Test Document Scan ingested! Slotted into Document Viewport.');

    // 2. Successful Selfie Simulation
    await handleSimulate('selfie');
    assert.equal(isSimulating, null, 'Must unlock after completion');
    assert.equal(callbackTriggered, 'selfie', 'Callback must be called with selfie');
    assert.equal(simSuccessMsg, '✓ Test Traveler Selfie ingested! Live photo screening triggered.');

    // 3. Error Recovery
    simSuccessMsg = null;
    callbackTriggered = null;
    await handleSimulate('document', true);
    assert.equal(isSimulating, null, 'Must unlock even on failure');
    assert.equal(callbackTriggered, null, 'Callback must not be called on failure');
    assert.equal(simSuccessMsg, null);
  });

  // =========================================================================
  // SUITE 4: Live Device Monitor Telemetry & Polling Parsing
  // =========================================================================
  console.log('\n--- SUITE 4: Live Device Monitor Telemetry & Edge Cases ---');

  await test('getCompanionInfo parses gateway URLs and telemetry array accurately', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (url.endsWith('/api/v1/companion/info')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ok',
            primary_ip: '192.168.1.50',
            local_ips: ['192.168.1.50', '10.0.0.1'],
            port: 8000,
            gateway_url: 'http://192.168.1.50:8000',
            emulator_url: 'http://10.0.2.2:8000',
            adb_command: 'adb reverse tcp:8000 tcp:8000',
            active_devices_count: 2,
            devices: [
              {
                client_ip: '192.168.1.101',
                user_agent: 'Pixel 7 (Field Unit #1)',
                checkpoint_id: 'WB-JAI-01',
                last_seen: '2026-08-24T06:00:00Z',
                last_endpoint: '/api/v1/companion/upload',
                total_requests: 18,
                latency_ms: 12.4,
                status: 'ONLINE',
              },
              {
                client_ip: '192.168.1.102',
                user_agent: 'Samsung Galaxy Tab (Field Unit #2)',
                checkpoint_id: 'WB-JAI-01',
                last_seen: '2026-08-24T06:00:01Z',
                last_endpoint: '/api/v1/companion/upload',
                total_requests: 5,
                latency_ms: 22.8,
                status: 'ONLINE',
              },
            ],
            checkpoint_id: 'SSB-WB-JAI-01',
            timestamp: 1724480000,
          }),
        } as any;
      }
      return { ok: false } as any;
    }) as any;

    try {
      const info = await getCompanionInfo();
      assert.ok(info !== null);
      assert.equal(info?.gateway_url, 'http://192.168.1.50:8000');
      assert.equal(info?.active_devices_count, 2);
      assert.equal(info?.devices.length, 2);
      assert.equal(info?.devices[0].client_ip, '192.168.1.101');
      assert.equal(info?.devices[0].latency_ms, 12.4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // =========================================================================
  // SUITE 5: Static Analysis & Code Invariant Assertions
  // =========================================================================
  console.log('\n--- SUITE 5: Source Code Static Invariants & Integrity ---');

  await test('ConnectModal.tsx contains all required accessible ARIA attributes and labels', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    assert.ok(code.includes('role="dialog"'), 'Must have role="dialog"');
    assert.ok(code.includes('aria-modal="true"'), 'Must have aria-modal="true"');
    assert.ok(code.includes('aria-labelledby="companion-modal-title"'), 'Must have aria-labelledby');
    assert.ok(code.includes('id="companion-modal-title"'), 'Must have companion-modal-title element');
  });

  await test('ConnectModal.tsx handles backdrop click dismissal without dismissing on modal content click', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      code.includes('if (e.target === e.currentTarget) onClose()'),
      'Must check e.target === e.currentTarget before calling onClose'
    );
  });

  await test('ConnectModal.tsx cleans up polling interval and event listeners on unmount', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/ConnectModal.tsx');
    const code = fs.readFileSync(modalPath, 'utf8');

    assert.ok(code.includes('clearInterval(interval)'), 'Must clear interval on unmount');
    assert.ok(code.includes('window.removeEventListener(\'keydown\', handleKeyDown)'), 'Must remove keydown listener');
    assert.ok(code.includes('isMountedRef.current = false'), 'Must mark isMountedRef false on unmount');
  });

  console.log('\n========================================================================');
  console.log(`TOTAL EMPIRICAL STRESS CHECKS RUN : ${total}`);
  console.log(`PASSED                            : ${passed}`);
  console.log(`FAILED                            : ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error('CHALLENGER M3 EMPIRICAL SUITE FAILED with errors:');
    for (const err of errors) {
      console.error(`- [${err.name}]:`, err.err);
    }
    process.exit(1);
  } else {
    console.log('ALL ADVERSARIAL CHALLENGER M3 EMPIRICAL CHECKS PASSED CLEANLY! 🚀\n');
  }
}

runAll().catch((err) => {
  console.error('Fatal test harness error:', err);
  process.exit(1);
});
