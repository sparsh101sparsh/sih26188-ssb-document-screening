import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import { ConnectModal, generateQRMatrix } from '../src/components/ConnectModal';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.stack || err?.message || err}`);
  }
}

async function runAll() {
  console.log('\n======================================================');
  console.log('QR CODE GENERATION & CONNECT MODAL VERIFICATION SUITE');
  console.log('======================================================\n');

  console.log('--- 1. Testing generateQRMatrix Mathematical Invariants ---');

  runTest('generateQRMatrix produces square boolean matrix for standard URLs', () => {
    const urls = [
      'http://localhost:8000',
      'http://192.168.1.1:8000',
      'http://192.168.43.100:8000',
      'http://10.0.2.2:8000',
    ];
    for (const url of urls) {
      const matrix = generateQRMatrix(url);
      assert.ok(Array.isArray(matrix), 'Matrix must be an array');
      assert.ok(matrix.length >= 21, 'Matrix size must be at least 21x21');
      assert.ok(matrix.every((row) => row.length === matrix.length), 'Matrix must be square');
    }
  });

  runTest('generateQRMatrix finder patterns at all 3 corners (7x7) across EC levels', () => {
    const levels: Array<'L' | 'M' | 'Q' | 'H'> = ['L', 'M', 'Q', 'H'];
    for (const lvl of levels) {
      const matrix = generateQRMatrix('http://192.168.1.100:8000', { errorCorrectionLevel: lvl });
      const size = matrix.length;

      const checkFinder = (top: number, left: number) => {
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
              `Finder module at (${row},${col}) for EC level ${lvl} should be ${expected}`
            );
          }
        }
      };

      checkFinder(0, 0);
      checkFinder(0, size - 7);
      checkFinder(size - 7, 0);
    }
  });

  runTest('generateQRMatrix horizontal and vertical timing patterns', () => {
    const matrix = generateQRMatrix('http://192.168.1.100:8000');
    const size = matrix.length;

    for (let i = 8; i < size - 8; i++) {
      const expected = i % 2 === 0;
      assert.equal(matrix[6][i], expected, `Horizontal timing at (6, ${i})`);
      assert.equal(matrix[i][6], expected, `Vertical timing at (${i}, 6)`);
    }
  });

  runTest('generateQRMatrix handles dynamic and extreme payloads without failure', () => {
    const extremePayloads = [
      '',
      ' ',
      '   ',
      'a',
      'http://[::1]:8000',
      'http://[fe80::1ff:fe23:4567:890a%eth0]:8000',
      'https://gateway.ssb.nic.in:9443/stream/live?officer=OF-9921&session=sess_982348912304802394820394823904820394',
      'http://10.0.2.2:8000/?query=1&space=%20&special=@#$%^&*()_+~`|}{[]:;?><,./',
      'http://very-long-gateway-subdomain-instance-name.corp.internal.ssb.gov.in:8000/api/v1/companion/upload/payload_test',
      'ssb-pairing://v1/connect?host=192.168.1.42&port=8000&auth=sig_298374982374&station=NER-PANITANKI-BAY01',
    ];

    for (const payload of extremePayloads) {
      const matrix = generateQRMatrix(payload);
      assert.ok(matrix.length >= 21, `Payload size was ${matrix.length}`);
      assert.ok(matrix.every((r) => r.length === matrix.length));
      assert.equal(matrix[0][0], true, 'Top-left finder intact');
    }
  });

  runTest('generateQRMatrix handles Unicode, Multilingual & Emoji payloads reliably', () => {
    const unicodePayloads = [
      'http://192.168.1.1:8000/एसएसबी-स्क्रीनिंग/गेटवे',
      'http://192.168.1.1:8000/সশস্ত্র_সীমা_বল',
      'http://192.168.1.1:8000/सीमा_सुरक्षा_चौकी?officer=सशस्त्र_बल',
      'http://192.168.1.1:8000/gateway?tag=🛂🇮🇳🔒',
    ];

    for (const payload of unicodePayloads) {
      const matrix = generateQRMatrix(payload);
      assert.ok(matrix.length >= 21, `Unicode payload matrix size was ${matrix.length}`);
      assert.equal(matrix[0][0], true, 'Top-left finder intact for Unicode');
    }
  });

  runTest('generateQRMatrix handles non-string and oversized payloads gracefully without crashing', () => {
    // Non-string inputs
    const matrixNull = generateQRMatrix(null as any);
    assert.ok(matrixNull.length >= 21, 'Null input produces valid fallback matrix');

    const matrixUndefined = generateQRMatrix(undefined as any);
    assert.ok(matrixUndefined.length >= 21, 'Undefined input produces valid fallback matrix');

    const matrixNumber = generateQRMatrix(8000 as any);
    assert.ok(matrixNumber.length >= 21, 'Number input produces valid fallback matrix');

    // Massive 20,000-character payload exceeding QR Version 40 capacity
    const massiveText = 'A'.repeat(20000);
    const matrixMassive = generateQRMatrix(massiveText);
    assert.ok(matrixMassive.length >= 21, 'Massive payload falls back gracefully to standard matrix');
  });

  runTest('generateQRMatrix encodes binary payload identically to standard qrcode library across all EC levels', () => {
    const testCases = [
      { text: 'http://192.168.1.50:8000', ec: 'L' as const },
      { text: 'http://192.168.1.50:8000', ec: 'M' as const },
      { text: 'http://192.168.1.50:8000', ec: 'Q' as const },
      { text: 'http://192.168.1.50:8000', ec: 'H' as const },
      { text: 'https://ssb-border-patrol.internal.gov.in:8443/auth/stream', ec: 'M' as const },
    ];

    for (const { text, ec } of testCases) {
      const ourMatrix = generateQRMatrix(text, { errorCorrectionLevel: ec });
      const directQR = QRCode.create(text, { errorCorrectionLevel: ec });

      assert.equal(ourMatrix.length, directQR.modules.size);
      for (let r = 0; r < directQR.modules.size; r++) {
        for (let c = 0; c < directQR.modules.size; c++) {
          assert.equal(
            ourMatrix[r][c],
            Boolean(directQR.modules.get(r, c)),
            `Bit mismatch at row ${r}, col ${c} for level ${ec}`
          );
        }
      }
    }
  });

  console.log('\n--- 2. Testing ConnectModal Component Rendering & SVG QR Output ---');

  runTest('ConnectModal returns null when closed', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={false} onClose={() => {}} />
    );
    assert.equal(html, '', 'Closed modal must render empty');
  });

  runTest('ConnectModal renders SVG with crispEdges and dynamic gateway URL', () => {
    const gateway = 'http://192.168.43.50:8000';
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={gateway} />
    );

    assert.ok(html.includes('<svg'), 'Must render SVG element');
    assert.ok(html.includes('shape-rendering="crispEdges"'), 'Must have crispEdges shape rendering');
    assert.ok(html.includes('width="150"') || html.includes('height="150"'), 'Must preserve dimensions');
    assert.ok(html.includes(`aria-label="QR Code for ${gateway}"`), 'Must include accessible aria-label');
    assert.ok(html.includes(gateway), 'Must include gateway URL text in manual copy field');
  });

  runTest('ConnectModal strips trailing slashes gracefully', () => {
    const gatewayWithSlash = 'http://192.168.43.50:8000///';
    const expectedClean = 'http://192.168.43.50:8000';
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={gatewayWithSlash} />
    );

    assert.ok(html.includes(`aria-label="QR Code for ${expectedClean}"`));
    assert.ok(html.includes(expectedClean));
    assert.ok(!html.includes('8000///'));
  });

  runTest('ConnectModal trims surrounding whitespace from serverUrl', () => {
    const gatewayWithSpaces = '   http://192.168.1.105:8000/   ';
    const expectedClean = 'http://192.168.1.105:8000';
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={gatewayWithSpaces} />
    );

    assert.ok(html.includes(`aria-label="QR Code for ${expectedClean}"`));
    assert.ok(html.includes(expectedClean));
  });

  runTest('ConnectModal handles empty string serverUrl with standard fallback', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl="" />
    );

    assert.ok(html.includes('<svg'), 'Must render SVG element even with empty serverUrl');
    assert.ok(html.includes('http://localhost:8000'), 'Must fallback to default gateway URL');
  });

  runTest('ConnectModal preserves interactive navigation tabs and buttons', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} />
    );

    assert.ok(html.includes('Connect Android Field Phone'), 'Must render modal title');
    assert.ok(html.includes('1-Scan QR Connect'), 'Must render QR tab button');
    assert.ok(html.includes('Live Devices'), 'Must render Devices tab button');
    assert.ok(html.includes('Test Capture'), 'Must render Test Capture tab button');
    assert.ok(html.includes('USB / Emulator'), 'Must render USB/Emulator tab button');
    assert.ok(html.includes('Close'), 'Must render Close button');
    assert.ok(html.includes('SCAN WITH APP'), 'Must render scan indicator badge');
  });

  runTest('ConnectModal applies high-contrast theme styling for crisp optical scanning', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl="http://192.168.1.200:8000" />
    );

    // Verify SVG fill color is dark ink #0F172A for high contrast against white
    assert.ok(html.includes('fill="#0F172A"') || html.includes('fill="#0f172a"'), 'Must use #0F172A ink color');
    // Verify background color is pure white #ffffff
    assert.ok(html.includes('fill="#ffffff"') || html.includes('fill="#FFFFFF"'), 'Must use white background');
  });

  runTest('ConnectModal safely renders without throwing on extreme 50,000-character serverUrl', () => {
    const massiveUrl = 'http://' + 'A'.repeat(50000);
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={massiveUrl} />
    );
    assert.ok(html.includes('<svg'), 'Must render fallback SVG QR code without throwing');
    assert.ok(html.includes('shape-rendering="crispEdges"'), 'Must maintain crispEdges rendering');
  });

  runTest('ConnectModal safely handles non-string serverUrl props without throwing', () => {
    const htmlNull = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={null as any} />
    );
    assert.ok(htmlNull.includes('<svg'), 'Must render SVG for null serverUrl');

    const htmlNumber = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal isOpen={true} onClose={() => {}} serverUrl={8000 as any} />
    );
    assert.ok(htmlNumber.includes('<svg'), 'Must render SVG for number serverUrl');
  });

  runTest('Static source verification: 0 handcrafted Galois Field GF(256) or Reed-Solomon boilerplate in ConnectModal.tsx', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sourceCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ConnectModal.tsx'), 'utf8');

    // Verify handcrafted Galois field terms are completely absent
    const forbiddenPatterns = [
      /\bgf_exp\b/i,
      /\bgf_log\b/i,
      /\bGF256\b/i,
      /\bGaloisField\b/i,
      /\bgf_poly\b/i,
      /\bReedSolomon\b/i,
      /\b0x11d\b/i, // Standard GF(256) irreducible polynomial generator 285 / 0x11D
      /\b0x12d\b/i,
    ];

    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(sourceCode), `Found forbidden custom Galois Field boilerplate: ${pattern}`);
    }

    // Verify open-source library imports are present
    assert.ok(sourceCode.includes("from 'qrcode.react'") || sourceCode.includes('from "qrcode.react"'), 'Must import qrcode.react');
    assert.ok(sourceCode.includes("from 'qrcode'") || sourceCode.includes('from "qrcode"'), 'Must import qrcode');
  });

  console.log('\n=============================================');
  console.log(`TOTAL TESTS RUN : ${totalTests}`);
  console.log(`PASSED          : ${passedTests}`);
  console.log(`FAILED          : ${failedTests}`);
  console.log('=============================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll();

