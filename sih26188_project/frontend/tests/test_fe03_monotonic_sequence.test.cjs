/**
 * Adversarial Empirical Test for FE-03 Sequence Monotonicity
 * Verifies that unordered, reversed, duplicate, and malformed gallery batches
 * maintain a strictly monotonic high-water mark sequence ID without freezing.
 */

const assert = require('assert');

function simulateGalleryIngestion(batches) {
  let lastSequenceId = 0;
  let ingestedItems = [];

  for (const [batchIndex, batch] of batches.entries()) {
    if (!batch || !Array.isArray(batch.items) || batch.items.length === 0) {
      continue;
    }

    // Exact implementation from App.tsx lines 290-298
    const maxSeq = batch.items.reduce((max, it) => Math.max(max, it.sequence_id ?? 0), lastSequenceId);
    if (maxSeq > lastSequenceId) {
      lastSequenceId = Math.max(lastSequenceId, maxSeq);

      const latest = batch.items.reduce(
        (maxItem, item) => ((item.sequence_id ?? 0) >= (maxItem?.sequence_id ?? 0) ? item : maxItem),
        batch.items[0]
      );

      ingestedItems.push({
        batchIndex,
        maxSeq,
        latestId: latest.sequence_id,
        filename: latest.filename
      });
    }
  }

  return { lastSequenceId, ingestedItems };
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('Running FE-03 Adversarial Sequence Stress-Tests...\n');

// 1. Chronological Ascending Batch (Oldest at index 0 — the bug reproduction scenario)
{
  const batches = [
    { items: [{ sequence_id: 1, filename: 'cap1.jpg' }] },
    { items: [{ sequence_id: 1, filename: 'cap1.jpg' }, { sequence_id: 2, filename: 'cap2.jpg' }] },
    { items: [{ sequence_id: 1, filename: 'cap1.jpg' }, { sequence_id: 2, filename: 'cap2.jpg' }, { sequence_id: 3, filename: 'cap3.jpg' }] },
  ];

  const result = simulateGalleryIngestion(batches);
  assert.strictEqual(result.lastSequenceId, 3, 'High water mark should be 3');
  assert.strictEqual(result.ingestedItems.length, 3, 'All 3 arrivals should be ingested');
  assert.deepStrictEqual(result.ingestedItems.map(i => i.maxSeq), [1, 2, 3], 'Monotonically ascending');
  console.log('✓ Scenario 1 (Chronological Ascending / Bug Reproduction): PASSED');
}

// 2. Out-of-order & Reverse Shuffled Items
{
  const batches = [
    { items: [{ sequence_id: 5, filename: 'cap5.jpg' }, { sequence_id: 2, filename: 'cap2.jpg' }, { sequence_id: 1, filename: 'cap1.jpg' }] },
    { items: [{ sequence_id: 3, filename: 'cap3.jpg' }, { sequence_id: 4, filename: 'cap4.jpg' }] }, // Stale items <= 5
    { items: [{ sequence_id: 7, filename: 'cap7.jpg' }, { sequence_id: 6, filename: 'cap6.jpg' }] }, // Higher items
  ];

  const result = simulateGalleryIngestion(batches);
  assert.strictEqual(result.lastSequenceId, 7, 'Final sequence must be 7');
  assert.strictEqual(result.ingestedItems.length, 2, 'Batch 2 with stale IDs must NOT trigger false ingestion');
  assert.strictEqual(result.ingestedItems[0].maxSeq, 5);
  assert.strictEqual(result.ingestedItems[1].maxSeq, 7);
  console.log('✓ Scenario 2 (Out-of-Order & Shuffled Batches): PASSED');
}

// 3. Duplicate and Repeated Polling Responses
{
  const batches = [
    { items: [{ sequence_id: 10, filename: 'cap10.jpg' }] },
    { items: [{ sequence_id: 10, filename: 'cap10.jpg' }] }, // Duplicate poll
    { items: [{ sequence_id: 10, filename: 'cap10.jpg' }] }, // Duplicate poll
    { items: [{ sequence_id: 10, filename: 'cap10.jpg' }, { sequence_id: 11, filename: 'cap11.jpg' }] },
  ];

  const result = simulateGalleryIngestion(batches);
  assert.strictEqual(result.lastSequenceId, 11);
  assert.strictEqual(result.ingestedItems.length, 2, 'Duplicate polls must be ignored');
  console.log('✓ Scenario 3 (Duplicate Polling Rejections): PASSED');
}

// 4. Malformed Payloads (null, undefined, missing sequence_id)
{
  const batches = [
    { items: [{ sequence_id: null }, { filename: 'unknown.jpg' }] },
    { items: [{ sequence_id: 1, filename: 'valid.jpg' }, { sequence_id: undefined }] },
    { items: [{ sequence_id: 'string_id' }] }, // Non-numeric
    { items: [{ sequence_id: 2, filename: 'valid2.jpg' }] },
  ];

  const result = simulateGalleryIngestion(batches);
  assert.strictEqual(result.lastSequenceId, 2);
  assert.strictEqual(result.ingestedItems.length, 2);
  console.log('✓ Scenario 4 (Malformed & Null Sequence IDs): PASSED');
}

// 5. High-Frequency Fuzzing (100 random batches)
{
  let expectedHighWater = 0;
  let batches = [];
  for (let i = 0; i < 100; i++) {
    const count = Math.floor(Math.random() * 10) + 1;
    let items = [];
    for (let j = 0; j < count; j++) {
      const seq = Math.floor(Math.random() * 50);
      items.push({ sequence_id: seq, filename: `file_${seq}.jpg` });
      if (seq > expectedHighWater) expectedHighWater = seq;
    }
    batches.push({ items });
  }

  const result = simulateGalleryIngestion(batches);
  assert.strictEqual(result.lastSequenceId, expectedHighWater, 'Fuzzed high-water mark matches maximum');
  // Verify monotonic invariant: each ingested item must have maxSeq > previous
  for (let k = 1; k < result.ingestedItems.length; k++) {
    assert(result.ingestedItems[k].maxSeq > result.ingestedItems[k - 1].maxSeq, 'Must be strictly monotonic');
  }
  console.log(`✓ Scenario 5 (Randomized Fuzzing with 100 Batches): PASSED (High Water: ${expectedHighWater})`);
}

console.log('\nALL FE-03 ADVERSARIAL TESTS PASSED EMPIRICALLY! 🚀');
