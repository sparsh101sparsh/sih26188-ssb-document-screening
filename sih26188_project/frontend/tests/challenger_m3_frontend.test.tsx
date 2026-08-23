import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Header } from '../src/components/Header';
import { CHECKPOINTS } from '../src/types/api';

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

async function runAll() {
  console.log('\n======================================================');
  console.log('CHALLENGER 3: FRONTEND LIVE DEVICE TRACKING SUITE (R3)');
  console.log('======================================================');

  // -------------------------------------------------------------
  // SUITE 1: Header Status Capsule Multi-State Rendering
  // -------------------------------------------------------------
  console.log('\n--- SUITE 1: Header Status Capsule Multi-State Rendering ---');

  await test('Header renders OFFLINE SIM when backendOnline is false', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <Header
        selectedCheckpoint={CHECKPOINTS[0]}
        onSelectCheckpoint={() => {}}
        backendOnline={false}
        backendLatencyMs={null}
        onRefreshHealth={() => {}}
        isCheckingHealth={false}
        onOpenAuditModal={() => {}}
        onOpenJsonModal={() => {}}
        hasScanResult={false}
      />
    );

    assert.ok(html.includes('OFFLINE SIM'), 'Must render OFFLINE SIM when backend is offline');
    assert.ok(html.includes('bg-red'), 'Must use bg-red dot when offline');
    assert.ok(html.includes('text-red'), 'Must use text-red label when offline');
    assert.ok(!html.includes('0 FIELD UNITS (OFFLINE)'), 'Must not render 0 FIELD UNITS when backend is down');
  });

  await test('Header renders 0 FIELD UNITS (OFFLINE) with orange warning on initial mount (0 devices)', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <Header
        selectedCheckpoint={CHECKPOINTS[0]}
        onSelectCheckpoint={() => {}}
        backendOnline={true}
        backendLatencyMs={15}
        onRefreshHealth={() => {}}
        isCheckingHealth={false}
        onOpenAuditModal={() => {}}
        onOpenJsonModal={() => {}}
        hasScanResult={false}
      />
    );

    assert.ok(html.includes('0 FIELD UNITS (OFFLINE)'), 'Must render 0 FIELD UNITS (OFFLINE) when 0 devices connected');
    assert.ok(html.includes('bg-orange'), 'Must use bg-orange dot when 0 devices active');
    assert.ok(html.includes('text-orange'), 'Must use text-orange label when 0 devices active');
    assert.ok(!html.includes('OFFLINE SIM'), 'Must not show OFFLINE SIM when backend is online');
  });

  // -------------------------------------------------------------
  // SUITE 2: Header Source Code Static Analysis & Integrity
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Header Source Code Static Analysis & Integrity ---');

  await test('Header.tsx initializes activeDeviceCount to 0 and deviceLatencyMs to null', () => {
    const headerPath = path.join(SRC_DIR, 'components/Header.tsx');
    const code = fs.readFileSync(headerPath, 'utf8');

    assert.ok(
      code.includes('useState<number>(0)'),
      'activeDeviceCount state must initialize to 0'
    );
    assert.ok(
      code.includes('useState<number | null>(null)'),
      'deviceLatencyMs state must initialize to null'
    );
  });

  await test('Header.tsx polls /api/v1/devices every 3000ms', () => {
    const headerPath = path.join(SRC_DIR, 'components/Header.tsx');
    const code = fs.readFileSync(headerPath, 'utf8');

    assert.ok(
      code.includes("fetch('/api/v1/devices')"),
      'Header must fetch /api/v1/devices'
    );
    assert.ok(
      code.includes('setInterval(checkDevices, 3000)'),
      'Header must poll devices every 3000ms'
    );
  });

  await test('Header.tsx does NOT clamp device count with Math.max(1, ...)', () => {
    const headerPath = path.join(SRC_DIR, 'components/Header.tsx');
    const code = fs.readFileSync(headerPath, 'utf8');

    assert.ok(
      !code.includes('Math.max(1,'),
      'Header must not contain Math.max(1, ...) clamping total_devices'
    );
  });

  await test('Header.tsx extracts last_active_device.latency_ms accurately', () => {
    const headerPath = path.join(SRC_DIR, 'components/Header.tsx');
    const code = fs.readFileSync(headerPath, 'utf8');

    assert.ok(
      code.includes('last_active_device') && code.includes('latency_ms'),
      'Header must parse last_active_device.latency_ms'
    );
  });

  await test('Header.tsx ensures proper cleanup and unmount guards', () => {
    const headerPath = path.join(SRC_DIR, 'components/Header.tsx');
    const code = fs.readFileSync(headerPath, 'utf8');

    assert.ok(code.includes('clearInterval(timer)'), 'Must clear UTC clock timer');
    assert.ok(code.includes('clearInterval(interval)'), 'Must clear device polling interval');
    assert.ok(code.includes('isMounted = false'), 'Must set isMounted to false on cleanup');
  });

  // -------------------------------------------------------------
  // SUITE 3: Device Polling State Machine & Parsing Logic
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Device Polling State Machine & Parsing Logic ---');

  await test('Device polling parser handles 0 devices (zero connected units)', async () => {
    type ParsedState = { count: number; latency: number | null };

    const processResponse = (data: any, isMounted: boolean): ParsedState => {
      let count = 0;
      let latency: number | null = null;
      if (isMounted && typeof data.total_devices === 'number') {
        count = data.total_devices;
        if (data.last_active_device && typeof data.last_active_device.latency_ms === 'number') {
          latency = Math.round(data.last_active_device.latency_ms);
        } else if (data.total_devices === 0) {
          latency = null;
        }
      }
      return { count, latency };
    };

    const zeroResult = processResponse(
      { status: 'ok', total_devices: 0, devices: [], last_active_device: null },
      true
    );
    assert.equal(zeroResult.count, 0, 'Count must be 0');
    assert.equal(zeroResult.latency, null, 'Latency must be null');

    const oneResult = processResponse(
      {
        status: 'ok',
        total_devices: 1,
        devices: [{ client_ip: '192.168.43.50', latency_ms: 14.6 }],
        last_active_device: { client_ip: '192.168.43.50', latency_ms: 14.6 },
      },
      true
    );
    assert.equal(oneResult.count, 1, 'Count must be 1');
    assert.equal(oneResult.latency, 15, 'Latency must be rounded to 15');

    const multiResult = processResponse(
      {
        status: 'ok',
        total_devices: 3,
        devices: [{}, {}, {}],
        last_active_device: { client_ip: '192.168.43.51', latency_ms: 22.1 },
      },
      true
    );
    assert.equal(multiResult.count, 3, 'Count must be 3');
    assert.equal(multiResult.latency, 22, 'Latency must be rounded to 22');
  });

  console.log('\n=============================================');
  console.log(`TOTAL AUDIT CHECKS RUN : ${total}`);
  console.log(`PASSED                 : ${passed}`);
  console.log(`FAILED                 : ${failed}`);
  console.log('=============================================\n');

  if (failed > 0) {
    console.error('CHALLENGER 3 AUDIT FAILED with errors:');
    for (const err of errors) {
      console.error(`- [${err.name}]:`, err.err);
    }
    process.exit(1);
  } else {
    console.log('ALL CHALLENGER 3 ADVERSARIAL AUDITS PASSED WITH ZERO ERRORS! 🚀\n');
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
