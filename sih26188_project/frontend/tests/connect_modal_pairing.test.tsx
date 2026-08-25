import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ConnectModal,
  generateQRMatrix,
  isValidIpv4,
  IPV4_REGEX,
} from '../src/components/ConnectModal';
import { getPairingQr, pingGateway } from '../src/services/api';
import { PairingQrResponse } from '../src/types/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          passedTests++;
          console.log(`  ✓ ${name}`);
        })
        .catch((err) => {
          failedTests++;
          console.error(`  ✗ ${name}`);
          console.error(`    ${err?.stack || err?.message || err}`);
        });
    }
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.stack || err?.message || err}`);
  }
}

async function runAll() {
  console.log('\n================================================================');
  console.log('CONNECT MODAL UI & PAIRING QR INTEGRATION TEST SUITE (M3 / R8)');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: IPv4 Regex & Validation Logic
  // -------------------------------------------------------------
  console.log('--- 1. Testing IPv4 Regex Validation & Sanitization ---');

  runTest('isValidIpv4 accepts valid standard IPv4 addresses', () => {
    const validIps = [
      '192.168.1.1',
      '192.168.1.254',
      '10.0.0.1',
      '172.16.254.1',
      '127.0.0.1',
      'localhost',
      '  192.168.43.100  ',
      '0.0.0.0',
      '255.255.255.255',
    ];
    for (const ip of validIps) {
      assert.equal(isValidIpv4(ip), true, `Expected ${ip} to be valid IPv4`);
    }
  });

  runTest('isValidIpv4 rejects invalid IPv4 addresses and malicious strings', () => {
    const invalidIps = [
      '192.168.1.256',
      '192.168.1.999',
      '192.168.1',
      '192.168.1.1.1',
      'abc.def.ghi.jkl',
      '-1.0.0.0',
      'http://192.168.1.1',
      '192.168.1.1:8000',
      '',
      '   ',
      null as any,
      undefined as any,
      12345 as any,
    ];
    for (const ip of invalidIps) {
      assert.equal(isValidIpv4(ip), false, `Expected ${ip} to be rejected`);
    }
  });

  runTest('IPV4_REGEX matches exact 4 octet boundaries', () => {
    assert.ok(IPV4_REGEX.test('10.10.10.10'));
    assert.ok(IPV4_REGEX.test('192.168.0.1'));
    assert.ok(!IPV4_REGEX.test('256.0.0.1'));
    assert.ok(!IPV4_REGEX.test('1.2.3'));
  });

  // -------------------------------------------------------------
  // SUITE 2: ConnectModal Rendering & Connection State Machine UI
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing ConnectModal Rendering & State Machine UI ---');

  runTest('ConnectModal returns null when closed', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={false} onClose={() => {}} />
    );
    assert.equal(html, '', 'Closed modal must render empty string');
  });

  runTest('ConnectModal renders modal header, scan instructions, and tabs when open', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl="http://192.168.1.50:8000" />
    );

    // Modal Title & Dialog Role
    assert.ok(html.includes('Connect Android Field Phone'), 'Must render title');
    assert.ok(html.includes('role="dialog"'), 'Must have accessible dialog role');
    assert.ok(html.includes('aria-modal="true"'), 'Must have aria-modal attribute');

    // Tab Navigation
    assert.ok(html.includes('1-Scan QR Connect'), 'Must render QR tab');
    assert.ok(html.includes('Live Devices'), 'Must render Devices tab');
    assert.ok(html.includes('Test Capture'), 'Must render Test tab');
    assert.ok(html.includes('USB / Emulator'), 'Must render USB tab');

    // 3-Step Illustrated Instructions
    assert.ok(html.includes('How to Connect in 3 Seconds:'), 'Must render step instructions heading');
    assert.ok(html.includes('Open the &lt;strong&gt;SSB Field Screening&lt;/strong&gt; app') || html.includes('SSB Field Screening'), 'Must mention app name');
    assert.ok(html.includes('Open QR Code Scanner'), 'Must mention QR scanner button');

    // Vector QR Code Display
    assert.ok(html.includes('<svg'), 'Must render SVG element for QR code');
    assert.ok(html.includes('shape-rendering="crispEdges"'), 'Must render with crispEdges');
    assert.ok(html.includes('SCAN WITH APP'), 'Must render scan indicator');

    // Gateway URL with Copy button
    assert.ok(html.includes('http://192.168.1.50:8000'), 'Must render gateway URL');
    assert.ok(html.includes('Copy'), 'Must render Copy button');
  });

  runTest('ConnectModal renders Advanced Manual IP Entry drawer toggle button', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} />
    );

    assert.ok(
      html.includes('Advanced / Manual Gateway IP Configuration') || html.includes('Advanced Manual'),
      'Must render Advanced manual IP configuration toggle'
    );
    assert.ok(html.includes('Configure IP/Port') || html.includes('Hide'), 'Must render toggle text');
  });

  runTest('ConnectModal renders footer with active port indicator', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} />
    );

    assert.ok(html.includes('SSB Gateway Port 8000 Active') || html.includes('Port 8000 Active'), 'Must render footer status');
    assert.ok(html.includes('Close'), 'Must render close button');
  });

  // -------------------------------------------------------------
  // SUITE 3: Pairing QR Endpoint & API Service Contract
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Pairing QR & Network API Service Functions ---');

  await runTest('getPairingQr is exported and handles fetch failures gracefully', async () => {
    assert.equal(typeof getPairingQr, 'function', 'getPairingQr must be a function');
    // Calling without active server should gracefully return null without throwing unhandled exceptions
    const result = await getPairingQr('http://127.0.0.1:59999');
    assert.equal(result, null, 'getPairingQr should return null when server is offline');
  });

  await runTest('pingGateway is exported and reports unreachable servers with latency', async () => {
    assert.equal(typeof pingGateway, 'function', 'pingGateway must be a function');
    const result = await pingGateway('http://127.0.0.1:59999');
    assert.ok(typeof result === 'object', 'pingGateway must return an object');
    assert.equal(result.success, false, 'Should report success false for offline server');
    assert.ok(typeof result.latencyMs === 'number', 'Should return numeric latency');
  });

  runTest('PairingQrResponse type conforms to backend pairing-qr schema', () => {
    const mockPairing: PairingQrResponse = {
      status: 'active',
      qr_payload: 'SSBPAIR://192.168.1.50:8000/a1b2c3d4',
      gateway_id: 'SSB-GW-MAC1234',
      pairing_token: 'a1b2c3d4',
      current_lan_ip: '192.168.1.50',
      port: 8000,
      fallback_url: 'http://192.168.1.50:8000',
      timestamp: Date.now(),
      available_interfaces: [{ name: 'wlan0', ip: '192.168.1.50' }],
    };

    assert.equal(mockPairing.status, 'active');
    assert.ok(mockPairing.qr_payload.startsWith('SSBPAIR://'));
    assert.equal(mockPairing.gateway_id, 'SSB-GW-MAC1234');
    assert.equal(mockPairing.pairing_token, 'a1b2c3d4');
    assert.equal(mockPairing.current_lan_ip, '192.168.1.50');
    assert.equal(mockPairing.port, 8000);
    assert.equal(mockPairing.fallback_url, 'http://192.168.1.50:8000');
  });

  // -------------------------------------------------------------
  // SUITE 4: Static Source Code & Integrity Audits (R6, R8)
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Static Source Code & Integrity Audits ---');

  runTest('ConnectModal.tsx contains live polling loop and unmount cleanup', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/ConnectModal.tsx');
    const code = fs.readFileSync(filePath, 'utf8');

    assert.ok(code.includes('clearInterval(pollTimerRef.current)'), 'Must clear interval on unmount');
    assert.ok(code.includes('isMountedRef'), 'Must have isMountedRef guard to prevent memory leaks');
    assert.ok(code.includes('getPairingQr'), 'Must invoke getPairingQr');
    assert.ok(code.includes('getCompanionInfo'), 'Must invoke getCompanionInfo');
    assert.ok(code.includes('pingGateway'), 'Must invoke pingGateway for manual IP test');
  });

  runTest('ConnectModal.tsx contains keyboard Escape dismiss listener', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/ConnectModal.tsx');
    const code = fs.readFileSync(filePath, 'utf8');

    assert.ok(code.includes("e.key === 'Escape'"), 'Must listen for Escape key');
    assert.ok(code.includes("window.removeEventListener('keydown'"), 'Must remove keydown listener on unmount');
  });

  runTest('Source Code Cleanliness: Zero hardcoded static IPs (R6)', () => {
    const filesToCheck = [
      'src/components/ConnectModal.tsx',
      'src/services/api.ts',
      'src/types/api.ts',
    ];

    const forbiddenIps = ['192.168.1.61', '10.198.211'];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const ip of forbiddenIps) {
        assert.ok(
          !content.includes(ip),
          `Found forbidden hardcoded IP "${ip}" in ${relPath}`
        );
      }
    }
  });

  console.log('\n================================================================');
  console.log(`TOTAL TESTS RUN : ${totalTests}`);
  console.log(`PASSED          : ${passedTests}`);
  console.log(`FAILED          : ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal error in connect modal pairing suite:', err);
  process.exit(1);
});
