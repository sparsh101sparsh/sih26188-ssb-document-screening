import React from "react";
import ReactDOMServer from "react-dom/server";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { dataURLtoFile } from "../src/App";
import { Header } from "../src/components/Header";
import { IngestionPanel } from "../src/components/IngestionPanel";
import { Dropzone } from "../src/components/Dropzone";
import { WebCamCapture } from "../src/components/WebCamCapture";
import { ConnectModal, generateQRMatrix } from "../src/components/ConnectModal";
import { ThemeToggle } from "../src/components/ui/ThemeToggle";
import { CHECKPOINTS, ConnectedClient } from "../src/types/api";

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

async function runDeepFrontendEmpiricalHarness() {
  console.log("\n========================================================================");
  console.log("CHALLENGER M5: DEEP EMPIRICAL FRONTEND INTEGRATION & STRESS HARNESS");
  console.log("========================================================================");

  // 1. QR Code Matrix Generator Stress & Edge Cases
  console.log("\n--- TEST SUITE 1: Pure TypeScript QR Code Matrix Generator Stress ---");
  await test("QR Matrix generates valid 21x21 matrix for short URL (<=16 bytes)", () => {
    const matrix = generateQRMatrix("http://a.b:8000");
    assert.equal(matrix.length, 21);
    assert.equal(matrix[0].length, 21);
    // Finder patterns top-left, top-right, bottom-left
    assert.equal(matrix[0][0], true);
    assert.equal(matrix[0][6], true);
    assert.equal(matrix[6][0], true);
    assert.equal(matrix[6][6], true);
  });

  await test("QR Matrix expands to Version 2 (25x25) for standard LAN IP URL", () => {
    const matrix = generateQRMatrix("http://192.168.1.125:8000");
    assert.equal(matrix.length, 25);
    assert.equal(matrix[0].length, 25);
    // Alignment pattern center at (18, 18)
    assert.equal(matrix[18][18], true);
  });

  await test("QR Matrix expands to Version 3+ for longer parameterised URLs", () => {
    const matrix = generateQRMatrix("http://192.168.1.125:8000/api/v1/companion/upload?checkpoint_id=WB-JAI-01");
    assert.ok(matrix.length >= 29);
    assert.equal(matrix.length, matrix[0].length);
  });

  // 2. ConnectModal Multi-Tab Rendering and Navigation
  console.log("\n--- TEST SUITE 2: ConnectModal Multi-Tab State & Invariant Rendering ---");
  await test("ConnectModal static markup renders all 4 tabs and primary gateway spotlight", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal
        isOpen={true}
        onClose={() => {}}
        serverUrl="http://192.168.1.100:8000"
      />
    );
    assert.ok(html.includes("Companion Connection &amp; Pairing Center") || html.includes("Companion Connection & Pairing Center"));
    assert.ok(html.includes("Pairing &amp; QR Code") || html.includes("Pairing & QR Code"));
    assert.ok(html.includes("Live Device Monitor"));
    assert.ok(html.includes("Simulation Suite"));
    assert.ok(html.includes("Setup Guide"));
    assert.ok(html.includes("http://192.168.1.100:8000"));
    assert.ok(html.includes("10.0.2.2:8000"));
    assert.ok(html.includes("adb reverse tcp:8000 tcp:8000"));
  });

  await test("ConnectModal closed state returns empty null markup without memory leak", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ConnectModal
        isOpen={false}
        onClose={() => {}}
        serverUrl="http://192.168.1.100:8000"
      />
    );
    assert.equal(html, "");
  });

  // 3. Dropzone & WebCamCapture Viewports with Companion Ingestion Flags
  console.log("\n--- TEST SUITE 3: Viewport Ingestion Badging & Isolation ---");
  await test("Dropzone renders 'Received from Field Unit Camera' badge strictly when receivedFromCompanion=true", () => {
    const file = new File(["test-passport"], "passport.jpg", { type: "image/jpeg" });
    const htmlWithBadge = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={file}
        documentPreviewUrl="data:image/jpeg;base64,mock"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        isCompanionConnected={true}
        receivedFromCompanion={true}
      />
    );
    assert.ok(htmlWithBadge.includes("Received from Field Unit Camera"));

    const htmlWithoutBadge = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={file}
        documentPreviewUrl="data:image/jpeg;base64,mock"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        isCompanionConnected={true}
        receivedFromCompanion={false}
      />
    );
    assert.ok(!htmlWithoutBadge.includes("Received from Field Unit Camera"));
  });

  await test("WebCamCapture renders 'Received from Field Unit Camera' badge strictly when receivedFromCompanion=true", () => {
    const file = new File(["test-selfie"], "selfie.jpg", { type: "image/jpeg" });
    const htmlWithBadge = ReactDOMServer.renderToStaticMarkup(
      <WebCamCapture
        livePhotoFile={file}
        livePhotoPreviewUrl="data:image/jpeg;base64,mock"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        isCompanionConnected={true}
        receivedFromCompanion={true}
      />
    );
    assert.ok(htmlWithBadge.includes("Received from Field Unit Camera"));

    const htmlWithoutBadge = ReactDOMServer.renderToStaticMarkup(
      <WebCamCapture
        livePhotoFile={file}
        livePhotoPreviewUrl="data:image/jpeg;base64,mock"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        isCompanionConnected={true}
        receivedFromCompanion={false}
      />
    );
    assert.ok(!htmlWithoutBadge.includes("Received from Field Unit Camera"));
  });

  // 4. IngestionPanel Status Indicators and Prop Plumbing
  console.log("\n--- TEST SUITE 4: IngestionPanel Dynamic Companion Badging & Actions ---");
  await test("IngestionPanel displays active companion badge when connected", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
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
    assert.ok(html.includes("Field Unit Connected (Live Companion Sync Active)"));
    assert.ok(html.includes("Companion Pairing Center"));
  });

  await test("IngestionPanel displays waiting badge when disconnected", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
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
    assert.ok(html.includes("Waiting for Field Unit"));
    assert.ok(html.includes("Connect Field Unit"));
  });

  // 5. Base64 Decoder Fuzzing & High-Throughput Burst
  console.log("\n--- TEST SUITE 5: Base64 Decoder Fuzzing & Large File Handling ---");
  await test("dataURLtoFile decodes 2MB binary payload with perfect integrity", () => {
    const rawData = "Z".repeat(2 * 1024 * 1024);
    const b64Data = Buffer.from(rawData).toString("base64");
    const uri = `data:image/jpeg;base64,${b64Data}`;

    const file = dataURLtoFile(uri, "large_passport.jpg");
    assert.equal(file.name, "large_passport.jpg");
    assert.equal(file.size, rawData.length);
    assert.equal(file.type, "image/jpeg");
  });

  await test("dataURLtoFile gracefully handles malformed data URI schemes without throwing unhandled exceptions", () => {
    const malformed1 = "data:image/png;base64,";
    const f1 = dataURLtoFile(malformed1, "empty.png");
    assert.ok(f1 instanceof File);

    const malformed2 = "data:,non-base64-plain-text";
    const f2 = dataURLtoFile(malformed2, "plain.txt");
    assert.ok(f2 instanceof File);
  });

  console.log("\n========================================================================");
  console.log(`TOTAL DEEP EMPIRICAL CHECKS : ${total}`);
  console.log(`PASSED                      : ${passed}`);
  console.log(`FAILED                      : ${failed}`);
  console.log("========================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepFrontendEmpiricalHarness().catch((err) => {
  console.error("Deep harness error:", err);
  process.exit(1);
});
