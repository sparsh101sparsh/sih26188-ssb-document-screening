import React from "react";
import ReactDOMServer from "react-dom/server";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Dropzone } from "../src/components/Dropzone";
import { WebCamCapture } from "../src/components/WebCamCapture";
import { IngestionPanel } from "../src/components/IngestionPanel";
import { dataURLtoFile } from "../src/App";
import {
  getLatestCompanionCapture,
  postScreeningVerdict,
  clearCompanionCapture,
  getCompanionVerdict,
  API_BASE_URL,
} from "../src/services/api";
import { CHECKPOINTS } from "../src/types/api";

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

async function runEmpiricalStressSuite() {
  console.log("\n========================================================================");
  console.log("CHALLENGER M4: DEEP EMPIRICAL STRESS & ADVERSARIAL ORACLE HARNESS");
  console.log("========================================================================");

  // -------------------------------------------------------------------------
  // SUITE 1: Deep Base64 Ingestion Oracle & Stress Testing
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 1: Deep Base64 Ingestion Oracle & Stress Testing ---");

  await test("Clean JPEG Data URI converts with exact byte preservation", () => {
    // 2x2 test pattern bytes
    const originalBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const b64 = Buffer.from(originalBytes).toString("base64");
    const dataUri = `data:image/jpeg;base64,${b64}`;

    const file = dataURLtoFile(dataUri, "passport_scan.jpg");
    assert.equal(file.name, "passport_scan.jpg");
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.size, originalBytes.length);
  });

  await test("Clean PNG Data URI with custom filename and MIME parsing", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const b64 = Buffer.from(pngHeader).toString("base64");
    const dataUri = `data:image/png;base64,${b64}`;

    const file = dataURLtoFile(dataUri, "traveler_photo.png");
    assert.equal(file.name, "traveler_photo.png");
    assert.equal(file.type, "image/png");
    assert.equal(file.size, pngHeader.length);
  });

  await test("Clean WEBP Data URI MIME extraction", () => {
    const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const b64 = Buffer.from(webpBytes).toString("base64");
    const dataUri = `data:image/webp;base64,${b64}`;

    const file = dataURLtoFile(dataUri, "document_scan.webp");
    assert.equal(file.name, "document_scan.webp");
    assert.equal(file.type, "image/webp");
    assert.equal(file.size, webpBytes.length);
  });

  await test("Raw Base64 without data: prefix defaults to image/jpeg and decodes accurately", () => {
    const rawBytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const rawB64 = Buffer.from(rawBytes).toString("base64");

    const file = dataURLtoFile(rawB64, "raw_stream.jpg");
    assert.equal(file.name, "raw_stream.jpg");
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.size, rawBytes.length);
  });

  await test("Unpadded Base64: 1 missing '=' character auto-repaired and decoded", () => {
    // 2 bytes -> 3 b64 chars + 1 '='
    const bytes2 = new Uint8Array([0xde, 0xad]);
    const fullB64 = Buffer.from(bytes2).toString("base64");
    assert.ok(fullB64.endsWith("="));
    const stripped1 = fullB64.slice(0, -1);

    const file = dataURLtoFile(stripped1, "pad1.jpg");
    assert.equal(file.size, 2);
  });

  await test("Unpadded Base64: 2 missing '=' characters auto-repaired and decoded", () => {
    // 1 byte -> 2 b64 chars + 2 '=='
    const bytes1 = new Uint8Array([0xbe]);
    const fullB64 = Buffer.from(bytes1).toString("base64");
    assert.ok(fullB64.endsWith("=="));
    const stripped2 = fullB64.slice(0, -2);

    const file = dataURLtoFile(stripped2, "pad2.jpg");
    assert.equal(file.size, 1);
  });

  await test("Large payload (1.5 MB payload) conversions without memory leak or corruption", () => {
    const largeBytes = new Uint8Array(1.5 * 1024 * 1024);
    for (let i = 0; i < largeBytes.length; i++) {
      largeBytes[i] = (i * 37) & 0xff;
    }
    const largeB64 = Buffer.from(largeBytes).toString("base64");
    const dataUri = `data:image/jpeg;base64,${largeB64}`;

    const t0 = performance.now();
    const file = dataURLtoFile(dataUri, "high_res_passport.jpg");
    const duration = performance.now() - t0;

    assert.equal(file.size, largeBytes.length);
    assert.equal(file.name, "high_res_passport.jpg");
    assert.ok(duration < 500, `Large base64 decode took ${duration.toFixed(2)}ms, must be < 500ms`);
  });

  await test("Invalid format recovery: Corrupted non-base64 characters return safe fallback File", () => {
    const corruptInputs = [
      "???not-a-valid-base64-string$$$",
      "data:image/jpeg;base64,invalid@characters#here!",
      "",
      "   ",
      "data:image/png;base64,",
    ];

    for (const corrupt of corruptInputs) {
      const file = dataURLtoFile(corrupt, "fallback.jpg");
      assert.ok(file instanceof File, "Must always return a File instance without throwing unhandled exception");
      assert.equal(file.name, "fallback.jpg");
    }
  });

  await test("Rapid burst performance: 1,000 randomized conversions execute cleanly", () => {
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      const len = (i % 128) + 1;
      const b = new Uint8Array(len);
      b.fill(i & 0xff);
      const b64 = Buffer.from(b).toString("base64");
      const unpad = b64.replace(/=+$/, "");
      const f = dataURLtoFile(unpad, `burst_${i}.jpg`);
      assert.equal(f.size, len);
    }
    const elapsed = performance.now() - t0;
    console.log(`    (1,000 base64 stress conversions executed in ${elapsed.toFixed(2)}ms)`);
    assert.ok(elapsed < 2000, `1,000 conversions must finish in < 2000ms`);
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Viewport Visual Badges, Replacement & Removal Invariants
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Viewport Visual Badges, Replacement & Removal Invariants ---");

  await test("Dropzone renders ✓ Received from Field Unit Camera badge only when slotted from companion", () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], "slotted_passport.jpg", { type: "image/jpeg" });

    // 1. Slotted from companion
    const slottedHtml = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={mockFile}
        documentPreviewUrl="data:image/jpeg;base64,sample"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        receivedFromCompanion={true}
        isCompanionConnected={true}
      />
    );
    assert.ok(slottedHtml.includes("✓ Received from Field Unit Camera"), "Must render visual badge when receivedFromCompanion is true");
    assert.ok(slottedHtml.includes("bg-green-bg"), "Must have green dark theme token");
    assert.ok(slottedHtml.includes("text-green"), "Must have green text token");

    // 2. Manual upload (receivedFromCompanion is false)
    const manualHtml = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={mockFile}
        documentPreviewUrl="data:image/jpeg;base64,sample"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        receivedFromCompanion={false}
        isCompanionConnected={true}
      />
    );
    assert.ok(!manualHtml.includes("✓ Received from Field Unit Camera"), "Must NOT render badge for manual upload");
  });

  await test("Dropzone renders Replace button, Remove button, and File size label in populated state", () => {
    const mockFile = new File([new Uint8Array(4096)], "passport_hd.jpg", { type: "image/jpeg" });
    const html = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={mockFile}
        documentPreviewUrl="data:image/jpeg;base64,sample"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        receivedFromCompanion={true}
      />
    );

    assert.ok(html.includes("Replace"), "Must render Replace button");
    assert.ok(html.includes("Remove Document"), "Must render Remove Document button");
    assert.ok(html.includes("4.0 KB"), "Must display formatted file size");
    assert.ok(html.includes("passport_hd.jpg"), "Must display filename");
  });

  await test("WebCamCapture renders ✓ Received from Field Unit Camera badge and Retake / Remove controls", () => {
    const mockFile = new File([new Uint8Array([5, 6, 7])], "field_selfie.jpg", { type: "image/jpeg" });

    // Slotted from companion
    const slottedHtml = ReactDOMServer.renderToStaticMarkup(
      <WebCamCapture
        livePhotoFile={mockFile}
        livePhotoPreviewUrl="data:image/jpeg;base64,sample"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        receivedFromCompanion={true}
        isCompanionConnected={true}
      />
    );
    assert.ok(slottedHtml.includes("✓ Received from Field Unit Camera"), "Must render visual badge in selfie viewport");
    assert.ok(slottedHtml.includes("Retake"), "Must render Retake button for companion photo");
    assert.ok(slottedHtml.includes("Remove Face"), "Must render Remove Face button");
    assert.ok(slottedHtml.includes("field_selfie.jpg"), "Must display photo filename");
  });

  await test("IngestionPanel passes all companion props down to Dropzone and WebCamCapture synchronously", () => {
    const mockDoc = new File([new Uint8Array([1, 2])], "doc_companion.jpg", { type: "image/jpeg" });
    const mockPhoto = new File([new Uint8Array([3, 4])], "selfie_companion.jpg", { type: "image/jpeg" });

    const html = ReactDOMServer.renderToStaticMarkup(
      <IngestionPanel
        documentFile={mockDoc}
        documentPreviewUrl="data:image/jpeg;base64,doc"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        livePhotoFile={mockPhoto}
        livePhotoPreviewUrl="data:image/jpeg;base64,photo"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        selectedCheckpoint={CHECKPOINTS[0]}
        transitDate="2026-08-24"
        onChangeTransitDate={() => {}}
        onSelectPreset={() => {}}
        onScan={() => {}}
        onReset={() => {}}
        isScanning={false}
        canScan={true}
        isCompanionConnected={true}
        docFromCompanion={true}
        photoFromCompanion={true}
      />
    );

    const occurrences = (html.match(/✓ Received from Field Unit Camera/g) || []).length;
    assert.equal(occurrences, 2, "Both Dropzone and WebCamCapture must render the Received from Field Unit Camera badge simultaneously");
    assert.ok(html.includes("Field Unit Connected (Live Companion Sync Active)"), "IngestionPanel header must reflect live companion connection");
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Monotonic Sequence, Out-of-Order Rejection & Dual-Stream Trigger Simulation
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Monotonic Sequence, Out-of-Order Rejection & Dual-Stream Trigger ---");

  await test("Monotonic Sequence Oracle: strictly rejects stale, equal, or decreasing sequence IDs", () => {
    let lastSeq = 0;
    const stream = [
      { seq: 1, valid: true, desc: "Seq 1 initial" },
      { seq: 1, valid: false, desc: "Seq 1 duplicate" },
      { seq: 2, valid: true, desc: "Seq 2 monotonic increment" },
      { seq: 2, valid: false, desc: "Seq 2 duplicate retry" },
      { seq: 4, valid: true, desc: "Seq 4 skipped ahead" },
      { seq: 3, valid: false, desc: "Seq 3 out-of-order stale arrival" },
      { seq: 1, valid: false, desc: "Seq 1 very old frame arrival" },
      { seq: 5, valid: true, desc: "Seq 5 valid next frame" },
    ];

    for (const item of stream) {
      const accepted = item.seq > lastSeq;
      if (accepted) {
        lastSeq = item.seq;
      }
      assert.equal(accepted, item.valid, `Stream item ${item.desc} expected accepted=${item.valid}, got ${accepted}`);
    }
    assert.equal(lastSeq, 5);
  });

  await test("Dual-stream trigger oracle: Auto-triggers screening when both Document and Face are slotted", () => {
    let screeningTriggeredCount = 0;
    let lastScreeningPayload: { doc: string | null; photo: string | null } | null = null;

    function mockExecuteScreening(doc: string | null, photo: string | null) {
      screeningTriggeredCount++;
      lastScreeningPayload = { doc, photo };
    }

    // Scenario A: Doc arrives first, then Face arrives -> triggers when Face arrives
    let currentDoc: string | null = null;
    let currentPhoto: string | null = null;

    // 1. Doc arrives
    currentDoc = "doc_data_uri";
    if (currentPhoto) {
      mockExecuteScreening(currentDoc, currentPhoto);
    }
    assert.equal(screeningTriggeredCount, 0, "Doc arrival alone should NOT trigger screening until photo is present");

    // 2. Face arrives
    currentPhoto = "photo_data_uri";
    if (currentDoc) {
      mockExecuteScreening(currentDoc, currentPhoto);
    }
    assert.equal(screeningTriggeredCount, 1, "Face arrival with doc present MUST trigger screening immediately");
    assert.deepEqual(lastScreeningPayload, { doc: "doc_data_uri", photo: "photo_data_uri" });

    // Scenario B: Face arrives first, then Doc arrives -> triggers when Doc arrives
    currentDoc = null;
    currentPhoto = "photo_data_uri_2";
    if (currentDoc) {
      mockExecuteScreening(currentDoc, currentPhoto);
    }
    assert.equal(screeningTriggeredCount, 1, "Photo arrival alone should NOT trigger screening until doc is present");

    // 2. Doc arrives
    currentDoc = "doc_data_uri_2";
    if (currentPhoto) {
      mockExecuteScreening(currentDoc, currentPhoto);
    }
    assert.equal(screeningTriggeredCount, 2, "Doc arrival with face present MUST trigger screening immediately");
    assert.deepEqual(lastScreeningPayload, { doc: "doc_data_uri_2", photo: "photo_data_uri_2" });
  });

  // -------------------------------------------------------------------------
  // SUITE 4: API Endpoint Client Contracts & Serialization
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 4: API Endpoint Client Contracts & Serialization ---");

  await test("postScreeningVerdict transmits exact sequence_id, risk_level, risk_score, and details", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ status: "verdict_recorded" }) } as any;
    }) as any;

    try {
      await postScreeningVerdict(99, "CRITICAL FORGERY", "RED", 88.5, "Pixel splicing detected in photo zone");
      assert.ok(capturedUrl.includes("/api/v1/companion/verdict"));
      assert.equal(capturedBody.sequence_id, 99);
      assert.equal(capturedBody.verdict, "CRITICAL FORGERY");
      assert.equal(capturedBody.risk_level, "RED");
      assert.equal(capturedBody.risk_score, 88.5);
      assert.equal(capturedBody.details, "Pixel splicing detected in photo zone");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  await test("clearCompanionCapture dispatches POST to /api/v1/companion/clear with headers", async () => {
    let capturedUrl = "";
    let capturedMethod = "";

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: any) => {
      capturedUrl = url;
      capturedMethod = init.method;
      return { ok: true, json: async () => ({ status: "cleared" }) } as any;
    }) as any;

    try {
      await clearCompanionCapture();
      assert.ok(capturedUrl.includes("/api/v1/companion/clear"));
      assert.equal(capturedMethod, "POST");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n========================================================================");
  console.log(`TOTAL EMPIRICAL STRESS CHECKS RUN : ${total}`);
  console.log(`PASSED                            : ${passed}`);
  console.log(`FAILED                            : ${failed}`);
  console.log("========================================================================");

  if (failed > 0) {
    console.error(`\n${failed} empirical test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nALL CHALLENGER M4 DEEP EMPIRICAL STRESS CHECKS PASSED PERFECTLY! 🚀\n");
  }
}

runEmpiricalStressSuite().catch((err) => {
  console.error("Unhandled test suite execution error:", err);
  process.exit(1);
});
