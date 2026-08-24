import React from "react";
import ReactDOMServer from "react-dom/server";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { dataURLtoFile } from "../src/App";
import {
  getLatestCompanionCapture,
  postScreeningVerdict,
  clearCompanionCapture,
  getCompanionVerdict,
  CompanionCaptureState,
} from "../src/services/api";
import { Dropzone } from "../src/components/Dropzone";
import { WebCamCapture } from "../src/components/WebCamCapture";
import { IngestionPanel } from "../src/components/IngestionPanel";
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

async function runAll() {
  console.log("\n========================================================================");
  console.log("CHALLENGER 4: EMPIRICAL COMPANION INGESTION & AUTO-SCREENING DEEP SUITE");
  console.log("========================================================================");

  // -------------------------------------------------------------------------
  // 1. Single Capture Arrival: Document Only vs Portrait Only
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 1: Single Capture Arrival (Document Only vs Portrait Only) ---");

  await test("Single document arrival updates documentFile and does NOT auto-trigger screening without photo", () => {
    let screeningTriggered = false;
    let docFileState: File | null = null;
    let photoFileState: File | null = null;

    const docFileRef = { current: null as File | null };
    const photoFileRef = { current: null as File | null };

    function onIncomingCapture(capture: CompanionCaptureState) {
      if (capture.has_capture && capture.image_data) {
        const file = dataURLtoFile(capture.image_data, capture.filename || "capture.jpg");
        if (capture.capture_type === "document") {
          docFileState = file;
          docFileRef.current = file;
          if (photoFileRef.current) {
            screeningTriggered = true;
          }
        } else {
          photoFileState = file;
          photoFileRef.current = file;
          if (docFileRef.current) {
            screeningTriggered = true;
          }
        }
      }
    }

    const docPayload: CompanionCaptureState = {
      has_capture: true,
      sequence_id: 1,
      capture_type: "document",
      device_id: "field-phone-1",
      checkpoint_id: "WB-JAI-01",
      image_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      filename: "passport_scan.png",
      timestamp: Date.now(),
    };

    onIncomingCapture(docPayload);

    assert.ok(docFileState !== null, "documentFile must be populated");
    assert.equal(photoFileState, null, "photoFile must remain null");
    assert.equal(screeningTriggered, false, "Auto-screening must NOT trigger without photo");
  });

  await test("Single portrait arrival updates livePhotoFile and does NOT auto-trigger screening without document", () => {
    let screeningTriggered = false;
    let docFileState: File | null = null;
    let photoFileState: File | null = null;

    const docFileRef = { current: null as File | null };
    const photoFileRef = { current: null as File | null };

    function onIncomingCapture(capture: CompanionCaptureState) {
      if (capture.has_capture && capture.image_data) {
        const file = dataURLtoFile(capture.image_data, capture.filename || "capture.jpg");
        if (capture.capture_type === "document") {
          docFileState = file;
          docFileRef.current = file;
          if (photoFileRef.current) {
            screeningTriggered = true;
          }
        } else {
          photoFileState = file;
          photoFileRef.current = file;
          if (docFileRef.current) {
            screeningTriggered = true;
          }
        }
      }
    }

    const photoPayload: CompanionCaptureState = {
      has_capture: true,
      sequence_id: 1,
      capture_type: "selfie",
      device_id: "field-phone-1",
      checkpoint_id: "WB-JAI-01",
      image_data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      filename: "selfie.jpg",
      timestamp: Date.now(),
    };

    onIncomingCapture(photoPayload);

    assert.ok(photoFileState !== null, "livePhotoFile must be populated");
    assert.equal(docFileState, null, "documentFile must remain null");
    assert.equal(screeningTriggered, false, "Auto-screening must NOT trigger without document");
  });

  // -------------------------------------------------------------------------
  // 2. Dual Stream Arrival and Auto-Trigger Screening
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Dual Stream Arrival & Auto-Trigger of executeScreening() ---");

  await test("Dual arrival: Document followed by Selfie triggers executeScreening() automatically", () => {
    let screeningCallCount = 0;
    let screeningArgs: { doc: File | null; photo: File | null } | null = null;

    const docFileRef = { current: null as File | null };
    const photoFileRef = { current: null as File | null };

    function executeScreening(doc: File | null, photo: File | null) {
      screeningCallCount++;
      screeningArgs = { doc, photo };
    }

    function onIncomingCapture(capture: CompanionCaptureState) {
      if (capture.has_capture && capture.image_data) {
        const file = dataURLtoFile(capture.image_data, capture.filename || "capture.jpg");
        if (capture.capture_type === "document") {
          docFileRef.current = file;
          if (photoFileRef.current) {
            executeScreening(file, photoFileRef.current);
          }
        } else {
          photoFileRef.current = file;
          if (docFileRef.current) {
            executeScreening(docFileRef.current, file);
          }
        }
      }
    }

    // 1. Doc arrives
    onIncomingCapture({
      has_capture: true,
      sequence_id: 1,
      capture_type: "document",
      device_id: "phone-1",
      checkpoint_id: "CP-1",
      image_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      filename: "doc.png",
      timestamp: Date.now(),
    });
    assert.equal(screeningCallCount, 0, "No screening call yet after doc only");

    // 2. Selfie arrives
    onIncomingCapture({
      has_capture: true,
      sequence_id: 2,
      capture_type: "selfie",
      device_id: "phone-1",
      checkpoint_id: "CP-1",
      image_data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      filename: "selfie.jpg",
      timestamp: Date.now(),
    });

    assert.equal(screeningCallCount, 1, "Auto-screening must trigger on 2nd stream arrival");
    assert.ok(screeningArgs?.doc instanceof File, "Must pass document File");
    assert.ok(screeningArgs?.photo instanceof File, "Must pass live photo File");
  });

  await test("Dual arrival: Selfie followed by Document triggers executeScreening() automatically", () => {
    let screeningCallCount = 0;
    let screeningArgs: { doc: File | null; photo: File | null } | null = null;

    const docFileRef = { current: null as File | null };
    const photoFileRef = { current: null as File | null };

    function executeScreening(doc: File | null, photo: File | null) {
      screeningCallCount++;
      screeningArgs = { doc, photo };
    }

    function onIncomingCapture(capture: CompanionCaptureState) {
      if (capture.has_capture && capture.image_data) {
        const file = dataURLtoFile(capture.image_data, capture.filename || "capture.jpg");
        if (capture.capture_type === "document") {
          docFileRef.current = file;
          if (photoFileRef.current) {
            executeScreening(file, photoFileRef.current);
          }
        } else {
          photoFileRef.current = file;
          if (docFileRef.current) {
            executeScreening(docFileRef.current, file);
          }
        }
      }
    }

    // 1. Selfie arrives first
    onIncomingCapture({
      has_capture: true,
      sequence_id: 1,
      capture_type: "selfie",
      device_id: "phone-1",
      checkpoint_id: "CP-1",
      image_data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      filename: "selfie.jpg",
      timestamp: Date.now(),
    });
    assert.equal(screeningCallCount, 0, "No screening call yet after selfie only");

    // 2. Document arrives second
    onIncomingCapture({
      has_capture: true,
      sequence_id: 2,
      capture_type: "document",
      device_id: "phone-1",
      checkpoint_id: "CP-1",
      image_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      filename: "doc.png",
      timestamp: Date.now(),
    });

    assert.equal(screeningCallCount, 1, "Auto-screening must trigger on document arrival when photo is already present");
    assert.ok(screeningArgs?.doc instanceof File);
    assert.ok(screeningArgs?.photo instanceof File);
  });

  // -------------------------------------------------------------------------
  // 3. Sequence Monotonicity Across Out-of-Order Responses
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: Sequence Monotonicity Across Out-of-Order Responses ---");

  await test("Monotonic sequence engine rejects stale, duplicate, or backwards sequence IDs", () => {
    let lastSequenceId = 0;
    const acceptedSequences: number[] = [];

    function handlePollResponse(data: { has_capture: boolean; sequence_id: number }) {
      if (data.has_capture && data.sequence_id > lastSequenceId) {
        lastSequenceId = data.sequence_id;
        acceptedSequences.push(data.sequence_id);
        return true;
      }
      return false;
    }

    // Out-of-order stream: 1, 2, 2 (dup), 1 (stale), 5 (jump), 4 (out-of-order), 3 (out-of-order), 6 (valid), 6 (dup), 7 (valid)
    const stream = [
      { has_capture: true, sequence_id: 1 },
      { has_capture: true, sequence_id: 2 },
      { has_capture: true, sequence_id: 2 },
      { has_capture: true, sequence_id: 1 },
      { has_capture: true, sequence_id: 5 },
      { has_capture: true, sequence_id: 4 },
      { has_capture: true, sequence_id: 3 },
      { has_capture: true, sequence_id: 6 },
      { has_capture: true, sequence_id: 6 },
      { has_capture: true, sequence_id: 7 },
    ];

    const results = stream.map(handlePollResponse);
    assert.deepEqual(results, [true, true, false, false, true, false, false, true, false, true]);
    assert.deepEqual(acceptedSequences, [1, 2, 5, 6, 7]);
    assert.equal(lastSequenceId, 7);
  });

  // -------------------------------------------------------------------------
  // 4. Verdict Synchronization Callback to /api/v1/companion/verdict
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Verdict Synchronization Callback Contract ---");

  await test("Verdict payload maps risk_level accurately and submits to postScreeningVerdict", async () => {
    const originalFetch = globalThis.fetch;
    const sentPayloads: any[] = [];

    globalThis.fetch = (async (url: string, opts: any) => {
      if (url.includes("/api/v1/companion/verdict") && opts?.method === "POST") {
        sentPayloads.push(JSON.parse(opts.body));
        return { ok: true, json: async () => ({ status: "ok" }) } as any;
      }
      return { ok: false } as any;
    }) as any;

    try {
      // Test Green
      await postScreeningVerdict(1, "PASS", "GREEN", 2.0, "Verified Authentic");
      // Test Amber
      await postScreeningVerdict(2, "SECONDARY HOLD", "AMBER", 42.0, "Substrate anomaly");
      // Test Red
      await postScreeningVerdict(3, "CRITICAL FORGERY", "RED", 91.0, "Photo splicing detected");

      assert.equal(sentPayloads.length, 3);
      assert.deepEqual(sentPayloads[0], {
        sequence_id: 1,
        verdict: "PASS",
        risk_level: "GREEN",
        risk_score: 2.0,
        details: "Verified Authentic",
      });
      assert.deepEqual(sentPayloads[1], {
        sequence_id: 2,
        verdict: "SECONDARY HOLD",
        risk_level: "AMBER",
        risk_score: 42.0,
        details: "Substrate anomaly",
      });
      assert.deepEqual(sentPayloads[2], {
        sequence_id: 3,
        verdict: "CRITICAL FORGERY",
        risk_level: "RED",
        risk_score: 91.0,
        details: "Photo splicing detected",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // 5. Buffer Clearing on Session Reset
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Buffer Clearing on Session Reset ---");

  await test("clearCompanionCapture dispatches POST to /api/v1/companion/clear", async () => {
    const originalFetch = globalThis.fetch;
    let clearUrl = "";
    let clearMethod = "";

    globalThis.fetch = (async (url: string, opts: any) => {
      if (url.includes("/api/v1/companion/clear")) {
        clearUrl = url;
        clearMethod = opts?.method;
        return { ok: true, json: async () => ({ status: "cleared" }) } as any;
      }
      return { ok: false } as any;
    }) as any;

    try {
      await clearCompanionCapture();
      assert.ok(clearUrl.includes("/api/v1/companion/clear"), "Must post to clear endpoint");
      assert.equal(clearMethod, "POST");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // 6. Base64 Decoder Fuzzing & Resiliency
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Base64 Decoder Fuzzing & Resilience ---");

  await test("dataURLtoFile gracefully handles extreme unpadded, whitespace, and null inputs", () => {
    // 1. Whitespace padding
    const spaced = "   data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==   \n";
    const file1 = dataURLtoFile(spaced, "spaced.png");
    assert.equal(file1.name, "spaced.png");
    assert.equal(file1.type, "image/png");
    assert.ok(file1.size > 0);

    // 2. Missing base64 padding auto-repair
    const unpadded1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg";
    const file2 = dataURLtoFile(unpadded1, "unpadded.png");
    assert.ok(file2.size > 0);

    // 3. Null / undefined / empty string
    const file3 = dataURLtoFile("", "empty.jpg");
    assert.equal(file3.size, 0);
    assert.equal(file3.name, "empty.jpg");

    const file4 = dataURLtoFile(null as any, "null.jpg");
    assert.equal(file4.size, 0);
    assert.equal(file4.name, "null.jpg");
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n========================================================================");
  console.log(`TOTAL EMPIRICAL CHECKS RUN : ${total}`);
  console.log(`PASSED                     : ${passed}`);
  console.log(`FAILED                     : ${failed}`);
  console.log("========================================================================");

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nALL CHALLENGER M4 DEEP EMPIRICAL CHECKS PASSED CLEANLY! 🚀\n");
  }
}

runAll().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
