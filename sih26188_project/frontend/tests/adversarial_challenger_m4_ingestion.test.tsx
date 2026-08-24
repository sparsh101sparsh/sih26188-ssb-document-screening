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

const SRC_DIR = path.resolve(process.cwd(), "src");

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
  console.log("\n======================================================");
  console.log("CHALLENGER 4: REAL-TIME INGESTION & AUTO-SCREENING (M4)");
  console.log("======================================================");

  // -------------------------------------------------------------
  // SUITE 1: dataURLtoFile Base64 Decoding & Robust Conversion Engine
  // -------------------------------------------------------------
  console.log("\n--- SUITE 1: dataURLtoFile Base64 Conversion Engine ---");

  await test("dataURLtoFile converts JPEG Data URI to File object with correct MIME and name", () => {
    const sampleB64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const file = dataURLtoFile(sampleB64, "passport_scan.jpg");

    assert.ok(file instanceof File, "Must return a standard DOM File instance");
    assert.equal(file.name, "passport_scan.jpg", "Filename must match provided argument");
    assert.equal(file.type, "image/jpeg", "MIME type must be image/jpeg");
    assert.ok(file.size > 0, "File must have non-zero byte size");
  });

  await test("dataURLtoFile converts PNG Data URI to File object", () => {
    const samplePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const file = dataURLtoFile(samplePng, "portrait.png");

    assert.ok(file instanceof File);
    assert.equal(file.name, "portrait.png");
    assert.equal(file.type, "image/png");
    assert.ok(file.size > 0);
  });

  await test("dataURLtoFile handles raw base64 string without data: header", () => {
    const rawB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const file = dataURLtoFile(rawB64, "raw_sample.png");

    assert.ok(file instanceof File);
    assert.equal(file.name, "raw_sample.png");
    assert.ok(file.size > 0);
  });

  await test("dataURLtoFile auto-fixes unpadded base64 strings missing trailing equal signs", () => {
    const unpadded = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg"; // stripped ==
    const file = dataURLtoFile(unpadded, "unpadded.png");

    assert.ok(file instanceof File);
    assert.ok(file.size > 0);
  });

  await test("dataURLtoFile safely handles corrupted or empty strings without throwing", () => {
    const corrupted = "invalid!!garbage%%base64";
    const file = dataURLtoFile(corrupted, "corrupt.jpg");

    assert.ok(file instanceof File);
    assert.equal(file.name, "corrupt.jpg");
  });

  // -------------------------------------------------------------
  // SUITE 2: Monotonic Sequence State Machine Simulation
  // -------------------------------------------------------------
  console.log("\n--- SUITE 2: Monotonic Sequence State Machine Simulation ---");

  await test("Sequence state machine strictly accepts monotonic increases and rejects duplicates/stale frames", () => {
    let lastSeenSequence = 0;
    const acceptedSequences: number[] = [];

    function processIncomingSequence(seq: number, hasCapture: boolean): boolean {
      if (hasCapture && seq > lastSeenSequence) {
        lastSeenSequence = seq;
        acceptedSequences.push(seq);
        return true;
      }
      return false;
    }

    // Sequence stream test
    assert.equal(processIncomingSequence(1, true), true, "Seq 1 accepted");
    assert.equal(processIncomingSequence(1, true), false, "Duplicate Seq 1 rejected");
    assert.equal(processIncomingSequence(0, true), false, "Stale Seq 0 rejected");
    assert.equal(processIncomingSequence(2, false), false, "Empty capture frame rejected");
    assert.equal(processIncomingSequence(2, true), true, "Seq 2 accepted");
    assert.equal(processIncomingSequence(5, true), true, "Seq 5 accepted");
    assert.equal(processIncomingSequence(4, true), false, "Out-of-order Seq 4 rejected");
    assert.equal(processIncomingSequence(6, true), true, "Seq 6 accepted");

    assert.deepEqual(acceptedSequences, [1, 2, 5, 6]);
    assert.equal(lastSeenSequence, 6);
  });

  // -------------------------------------------------------------
  // SUITE 3: Dropzone & WebCamCapture Viewport Indicators & Dark Theme
  // -------------------------------------------------------------
  console.log("\n--- SUITE 3: Dropzone & WebCamCapture Viewport Indicators ---");

  await test("Dropzone renders ✓ Received from Field Unit Camera badge when receivedFromCompanion is true", () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], "companion_passport.jpg", { type: "image/jpeg" });
    const html = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={mockFile}
        documentPreviewUrl="data:image/jpeg;base64,1234"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        receivedFromCompanion={true}
        isCompanionConnected={true}
      />
    );

    assert.ok(html.includes("Received from Field Unit Camera"), "Must display Received from Field Unit Camera badge");
    assert.ok(html.includes("Field Unit Connected (Live Companion Sync Active)"), "Must render live companion sync pill");
    assert.ok(html.includes("companion_passport.jpg"), "Must display filename");
  });

  await test("Dropzone does not render companion badge for manual local uploads", () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], "local_upload.jpg", { type: "image/jpeg" });
    const html = ReactDOMServer.renderToStaticMarkup(
      <Dropzone
        documentFile={mockFile}
        documentPreviewUrl="data:image/jpeg;base64,1234"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        receivedFromCompanion={false}
        isCompanionConnected={false}
      />
    );

    assert.ok(!html.includes("Received from Field Unit Camera"), "Must NOT show companion badge for manual upload");
    assert.ok(html.includes("local_upload.jpg"), "Must display local filename");
  });

  await test("WebCamCapture renders ✓ Received from Field Unit Camera badge when receivedFromCompanion is true", () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], "field_selfie.jpg", { type: "image/jpeg" });
    const html = ReactDOMServer.renderToStaticMarkup(
      <WebCamCapture
        livePhotoFile={mockFile}
        livePhotoPreviewUrl="data:image/jpeg;base64,1234"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        receivedFromCompanion={true}
        isCompanionConnected={true}
      />
    );

    assert.ok(html.includes("Received from Field Unit Camera"), "Must display companion badge in face viewport");
    assert.ok(html.includes("Field Unit Connected (Live Companion Sync Active)"), "Must render connected status");
    assert.ok(html.includes("field_selfie.jpg"), "Must display photo name");
  });

  await test("WebCamCapture renders retake and remove buttons for slotted companion photo", () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], "field_selfie.jpg", { type: "image/jpeg" });
    const html = ReactDOMServer.renderToStaticMarkup(
      <WebCamCapture
        livePhotoFile={mockFile}
        livePhotoPreviewUrl="data:image/jpeg;base64,1234"
        onCaptureFace={() => {}}
        onClearFace={() => {}}
        receivedFromCompanion={true}
      />
    );

    assert.ok(html.includes("Retake"), "Must have Retake button for manual override");
    assert.ok(html.includes("Remove Face"), "Must have remove face button");
  });

  await test("IngestionPanel passes companion status and badges down to viewports", () => {
    const mockDoc = new File([new Uint8Array([1, 2, 3])], "doc.jpg", { type: "image/jpeg" });
    const mockPhoto = new File([new Uint8Array([1, 2, 3])], "face.jpg", { type: "image/jpeg" });

    const html = ReactDOMServer.renderToStaticMarkup(
      <IngestionPanel
        documentFile={mockDoc}
        documentPreviewUrl="data:image/jpeg;base64,1234"
        onSelectDocument={() => {}}
        onClearDocument={() => {}}
        livePhotoFile={mockPhoto}
        livePhotoPreviewUrl="data:image/jpeg;base64,5678"
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

    assert.ok(html.includes("Field Unit Connected (Live Companion Sync Active)"), "IngestionPanel must render connected badge");
    assert.ok(html.includes("Received from Field Unit Camera"), "Must contain companion receipt badges");
  });

  // -------------------------------------------------------------
  // SUITE 4: Companion API Client Functions & Contracts
  // -------------------------------------------------------------
  console.log("\n--- SUITE 4: Companion API Client Functions & Contracts ---");

  await test("getLatestCompanionCapture queries GET /api/v1/companion/latest", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    globalThis.fetch = (async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          has_capture: true,
          sequence_id: 42,
          capture_type: "document",
          device_id: "unit-99",
          checkpoint_id: "WB-JAI-01",
          image_data: "data:image/jpeg;base64,test",
        }),
      } as any;
    }) as any;

    try {
      const capture = await getLatestCompanionCapture();
      assert.ok(requestedUrl.includes("/api/v1/companion/latest"), "Must query /api/v1/companion/latest");
      assert.equal(capture?.sequence_id, 42);
      assert.equal(capture?.capture_type, "document");
      assert.equal(capture?.device_id, "unit-99");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("postScreeningVerdict sends correct payload to POST /api/v1/companion/verdict", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    let requestBody: any = null;

    globalThis.fetch = (async (url: string, opts: any) => {
      requestedUrl = url;
      requestBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ status: "ok" }) } as any;
    }) as any;

    try {
      await postScreeningVerdict(10, "PASS", "GREEN", 2.5, "1:1 Biometric Match Verified");
      assert.ok(requestedUrl.includes("/api/v1/companion/verdict"), "Must POST to /api/v1/companion/verdict");
      assert.equal(requestBody.sequence_id, 10);
      assert.equal(requestBody.verdict, "PASS");
      assert.equal(requestBody.risk_level, "GREEN");
      assert.equal(requestBody.risk_score, 2.5);
      assert.equal(requestBody.details, "1:1 Biometric Match Verified");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("clearCompanionCapture sends POST to /api/v1/companion/clear", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    let requestMethod = "";

    globalThis.fetch = (async (url: string, opts: any) => {
      requestedUrl = url;
      requestMethod = opts.method;
      return { ok: true, json: async () => ({ status: "cleared" }) } as any;
    }) as any;

    try {
      await clearCompanionCapture();
      assert.ok(requestedUrl.includes("/api/v1/companion/clear"), "Must POST to /api/v1/companion/clear");
      assert.equal(requestMethod, "POST");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("getCompanionVerdict fetches verdict by sequence ID or latest", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrls: string[] = [];

    globalThis.fetch = (async (url: string) => {
      requestedUrls.push(url);
      return {
        ok: true,
        json: async () => ({
          has_verdict: true,
          sequence_id: 15,
          verdict: "PASS",
          risk_level: "GREEN",
          risk_score: 0.0,
          details: "Inspection verified",
        }),
      } as any;
    }) as any;

    try {
      const v1 = await getCompanionVerdict(15);
      const v2 = await getCompanionVerdict();
      assert.ok(requestedUrls[0].includes("/api/v1/companion/result/15"), "Must fetch /result/15 when sequence_id provided");
      assert.ok(requestedUrls[1].includes("/api/v1/companion/verdict"), "Must fetch /verdict when sequence_id omitted");
      assert.equal(v1?.sequence_id, 15);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // SUITE 5: Source Code Static Invariants & Integrity (App.tsx & Viewports)
  // -------------------------------------------------------------
  console.log("\n--- SUITE 5: Source Code Static Invariants & Integrity ---");

  await test("App.tsx contains sequence monotonic checking and dual-stream auto-screening", () => {
    const appCode = fs.readFileSync(path.join(SRC_DIR, "App.tsx"), "utf8");

    assert.ok(
      appCode.includes("sequence_id > lastSequenceIdRef.current") || appCode.includes("sequence_id > lastSequenceId"),
      "App.tsx must monotonically check sequence_id"
    );
    assert.ok(
      appCode.includes("postScreeningVerdict"),
      "App.tsx must invoke postScreeningVerdict to sync verdict back to companion"
    );
    assert.ok(
      appCode.includes("clearCompanionCapture"),
      "App.tsx must invoke clearCompanionCapture when resetting or processing buffers"
    );
    assert.ok(
      appCode.includes("docFromCompanion") && appCode.includes("photoFromCompanion"),
      "App.tsx must maintain docFromCompanion and photoFromCompanion states"
    );
  });

  await test("Dropzone.tsx and WebCamCapture.tsx contain companion connection and confirmation badges", () => {
    const dropzoneCode = fs.readFileSync(path.join(SRC_DIR, "components/Dropzone.tsx"), "utf8");
    const webcamCode = fs.readFileSync(path.join(SRC_DIR, "components/WebCamCapture.tsx"), "utf8");

    assert.ok(
      dropzoneCode.includes("Received from Field Unit Camera"),
      "Dropzone.tsx must include confirmation badge"
    );
    assert.ok(
      dropzoneCode.includes("Field Unit Connected (Live Companion Sync Active)"),
      "Dropzone.tsx must include live companion connection indicator"
    );
    assert.ok(
      webcamCode.includes("Received from Field Unit Camera"),
      "WebCamCapture.tsx must include confirmation badge"
    );
    assert.ok(
      webcamCode.includes("Field Unit Connected (Live Companion Sync Active)"),
      "WebCamCapture.tsx must include live companion connection indicator"
    );
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n======================================================");
  console.log(`TOTAL CHECKS RUN : ${total}`);
  console.log(`PASSED           : ${passed}`);
  console.log(`FAILED           : ${failed}`);
  console.log("======================================================");

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed in Milestone 4 Suite.`);
    process.exit(1);
  } else {
    console.log("\nALL CHALLENGER M4 REAL-TIME INGESTION TESTS PASSED! 🚀\n");
  }
}

runAll().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
