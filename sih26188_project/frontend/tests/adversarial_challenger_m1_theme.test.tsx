import React from 'react';
import ReactDOMServer from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ThemeToggle } from '../src/components/ui/ThemeToggle';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: Array<{ suite: string; name: string; error: any }> = [];

function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    failedTests++;
    failures.push({ suite, name, error: err });
    console.error(`  ✕ [${suite}] ${name}:`, err.message || err);
  }
}

console.log('\n======================================================');
console.log('CHALLENGER M1: EMPIRICAL DEFAULT DARK THEME VERIFICATION');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// 1. Static Analysis of index.html
// -----------------------------------------------------------------------------
console.log('--- 1. Static HTML Analysis of index.html ---');

const indexPath = path.resolve(process.cwd(), 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

runTest('Static HTML', 'Root <html> tag contains class="dark" by default', () => {
  assert.match(indexContent, /<html\s+lang="en"\s+class="dark">/, 'Expected <html lang="en" class="dark">');
});

runTest('Static HTML', 'Inline bootstrap script is in <head> before <body>', () => {
  const headMatch = indexContent.match(/<head>([\s\S]*?)<\/head>/);
  assert.ok(headMatch, 'Missing <head> section in index.html');
  const headContent = headMatch[1];
  assert.ok(headContent.includes("localStorage.getItem('bui-theme')"), 'Script must query bui-theme');
  assert.ok(headContent.includes("t !== 'light'"), 'Script must evaluate t !== "light"');
  assert.ok(headContent.includes("document.documentElement.classList.toggle('dark'"), 'Script must toggle dark class');
});

runTest('Static HTML', 'Inline bootstrap script is wrapped in try-catch to prevent uncaught exceptions', () => {
  assert.match(indexContent, /try\s*\{[\s\S]*?var t = localStorage\.getItem\('bui-theme'\);[\s\S]*?\}\s*catch\s*\(e\)\s*\{\}/);
});

// -----------------------------------------------------------------------------
// 2. Empirical Simulation of Inline Script Logic Matrix
// -----------------------------------------------------------------------------
console.log('\n--- 2. Inline Bootstrap Script Logic Matrix Simulation ---');

class MockDOMTokenList {
  private classes = new Set<string>();

  constructor(initialClasses: string[] = []) {
    initialClasses.forEach((c) => this.classes.add(c));
  }

  add(...tokens: string[]) {
    tokens.forEach((t) => this.classes.add(t));
  }

  remove(...tokens: string[]) {
    tokens.forEach((t) => this.classes.delete(t));
  }

  contains(token: string): boolean {
    return this.classes.has(token);
  }

  toggle(token: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) {
        this.classes.add(token);
        return true;
      } else {
        this.classes.delete(token);
        return false;
      }
    }
    if (this.classes.has(token)) {
      this.classes.delete(token);
      return false;
    } else {
      this.classes.add(token);
      return true;
    }
  }

  toArray(): string[] {
    return Array.from(this.classes);
  }
}

class MockStorage {
  private store = new Map<string, string>();
  public throwsOnAccess = false;

  getItem(key: string): string | null {
    if (this.throwsOnAccess) {
      throw new Error('SecurityError: The operation is insecure (localStorage disabled).');
    }
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.throwsOnAccess) {
      throw new Error('SecurityError: The operation is insecure (localStorage disabled).');
    }
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    if (this.throwsOnAccess) {
      throw new Error('SecurityError: The operation is insecure.');
    }
    this.store.delete(key);
  }

  clear() {
    if (this.throwsOnAccess) {
      throw new Error('SecurityError: The operation is insecure.');
    }
    this.store.clear();
  }
}

function simulateBootstrapScript(mockStorage: MockStorage, classList: MockDOMTokenList) {
  try {
    var t = mockStorage.getItem('bui-theme');
    classList.toggle('dark', t !== 'light');
  } catch (e) {
    // Graceful catch
  }
}

runTest('Script Simulation', 'Initial Launch (localStorage empty / null) -> Dark theme is active', () => {
  const storage = new MockStorage();
  const classList = new MockDOMTokenList(['dark']); // from <html class="dark">
  simulateBootstrapScript(storage, classList);
  assert.equal(classList.contains('dark'), true, 'Dark class must be active on initial launch');
});

runTest('Script Simulation', 'Following localStorage.clear() -> Dark theme is active', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'light');
  storage.clear();
  assert.equal(storage.getItem('bui-theme'), null);

  const classList = new MockDOMTokenList(['dark']);
  simulateBootstrapScript(storage, classList);
  assert.equal(classList.contains('dark'), true, 'Dark class must remain active after clear()');
});

runTest('Script Simulation', 'Explicit localStorage "light" -> Dark class is removed', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'light');

  const classList = new MockDOMTokenList(['dark']);
  simulateBootstrapScript(storage, classList);
  assert.equal(classList.contains('dark'), false, 'Dark class must be toggled off for explicit light');
});

runTest('Script Simulation', 'Explicit localStorage "dark" -> Dark class is retained', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'dark');

  const classList = new MockDOMTokenList(['dark']);
  simulateBootstrapScript(storage, classList);
  assert.equal(classList.contains('dark'), true, 'Dark class must be retained for explicit dark');
});

runTest('Script Simulation', 'Empty string localStorage value -> Defaults to dark mode', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', '');

  const classList = new MockDOMTokenList(['dark']);
  simulateBootstrapScript(storage, classList);
  assert.equal(classList.contains('dark'), true, 'Empty string must default to dark mode');
});

runTest('Script Simulation', 'Corrupted / unrecognized theme string -> Defaults to dark mode', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'solarized_amber_mode_v2');

  const classList = new MockDOMTokenList(['dark']);
  simulateBootstrapScript(storage, classList);
  assert.equal(classList.contains('dark'), true, 'Unknown theme must default to dark mode');
});

runTest('Script Simulation', 'LocalStorage throwing SecurityError (Safari Private Mode / Cookies Blocked)', () => {
  const storage = new MockStorage();
  storage.throwsOnAccess = true;

  const classList = new MockDOMTokenList(['dark']);
  assert.doesNotThrow(() => {
    simulateBootstrapScript(storage, classList);
  });
  assert.equal(classList.contains('dark'), true, 'Dark class from static HTML must remain intact on exception');
});

// -----------------------------------------------------------------------------
// 3. ThemeToggle Component Logic & Lifecycle Stress Tests
// -----------------------------------------------------------------------------
console.log('\n--- 3. ThemeToggle Component Simulation & State Transitions ---');

class ThemeEngineHarness {
  public dark: boolean;
  public classList: MockDOMTokenList;
  public storage: MockStorage;
  public animationFramesScheduled: number = 0;

  constructor(storage: MockStorage, initialHtmlClass: string[] = ['dark']) {
    this.storage = storage;
    this.classList = new MockDOMTokenList(initialHtmlClass);
    
    // Simulate ThemeToggle useEffect mount
    try {
      this.dark = this.storage.getItem('bui-theme') !== 'light';
    } catch {
      this.dark = this.classList.contains('dark');
    }
  }

  apply(next: boolean) {
    if (next === this.dark) return false;
    this.dark = next;
    this.classList.add('theme-switching');
    this.classList.toggle('dark', next);
    
    // Simulate double requestAnimationFrame
    this.animationFramesScheduled += 2;
    this.classList.remove('theme-switching');

    try {
      this.storage.setItem('bui-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    return true;
  }
}

runTest('ThemeToggle Harness', 'Mount with null localStorage -> initial state is true (Dark)', () => {
  const storage = new MockStorage();
  const harness = new ThemeEngineHarness(storage);
  assert.equal(harness.dark, true);
  assert.equal(harness.classList.contains('dark'), true);
});

runTest('ThemeToggle Harness', 'Mount with "light" localStorage -> initial state is false (Light)', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'light');
  const harness = new ThemeEngineHarness(storage);
  assert.equal(harness.dark, false);
});

runTest('ThemeToggle Harness', 'Mount with "dark" localStorage -> initial state is true (Dark)', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'dark');
  const harness = new ThemeEngineHarness(storage);
  assert.equal(harness.dark, true);
});

runTest('ThemeToggle Harness', 'Mount when localStorage throws -> falls back to classList.contains("dark")', () => {
  const storage = new MockStorage();
  storage.throwsOnAccess = true;
  const harness = new ThemeEngineHarness(storage, ['dark']);
  assert.equal(harness.dark, true);
});

runTest('ThemeToggle Harness', 'Transition: Dark -> Light (apply(false))', () => {
  const storage = new MockStorage();
  const harness = new ThemeEngineHarness(storage);
  assert.equal(harness.dark, true);

  const changed = harness.apply(false);
  assert.equal(changed, true);
  assert.equal(harness.dark, false);
  assert.equal(harness.classList.contains('dark'), false);
  assert.equal(storage.getItem('bui-theme'), 'light');
});

runTest('ThemeToggle Harness', 'Transition: Light -> Dark (apply(true))', () => {
  const storage = new MockStorage();
  storage.setItem('bui-theme', 'light');
  const harness = new ThemeEngineHarness(storage);
  assert.equal(harness.dark, false);

  const changed = harness.apply(true);
  assert.equal(changed, true);
  assert.equal(harness.dark, true);
  assert.equal(harness.classList.contains('dark'), true);
  assert.equal(storage.getItem('bui-theme'), 'dark');
});

runTest('ThemeToggle Harness', 'Idempotent invocation: apply(true) when already dark is a no-op', () => {
  const storage = new MockStorage();
  const harness = new ThemeEngineHarness(storage);
  const changed = harness.apply(true);
  assert.equal(changed, false, 'Should return early without state change');
  assert.equal(storage.getItem('bui-theme'), null, 'Storage should not be written for no-op');
});

runTest('ThemeToggle Harness', '1,000 rapid sequential toggle cycles stress test', () => {
  const storage = new MockStorage();
  const harness = new ThemeEngineHarness(storage);
  
  for (let i = 0; i < 1000; i++) {
    const target = i % 2 === 0 ? false : true;
    harness.apply(target);
    assert.equal(harness.dark, target);
    assert.equal(harness.classList.contains('dark'), target);
    assert.equal(storage.getItem('bui-theme'), target ? 'dark' : 'light');
  }
});

// -----------------------------------------------------------------------------
// 4. React SSR & Static Markup Rendering Tests
// -----------------------------------------------------------------------------
console.log('\n--- 4. ThemeToggle Component Static Markup Rendering ---');

runTest('React Render', 'ThemeToggle renders valid HTML with aria labels and SVG buttons', () => {
  const html = ReactDOMServer.renderToStaticMarkup(<ThemeToggle />);
  assert.ok(html.includes('aria-label="Light mode"'), 'Missing Light mode button');
  assert.ok(html.includes('aria-label="Dark mode"'), 'Missing Dark mode button');
  assert.ok(html.includes('grid-cols-2'), 'Missing segmented pill grid layout');
  assert.ok(html.includes('rounded-full'), 'Missing pill rounded classes');
  assert.ok(html.includes('svg'), 'Missing SVG icons');
});

// -----------------------------------------------------------------------------
// Summary & Verdict
// -----------------------------------------------------------------------------
console.log('\n=============================================');
console.log(`TOTAL TESTS RUN : ${totalTests}`);
console.log(`PASSED          : ${passedTests}`);
console.log(`FAILED          : ${failedTests}`);
console.log('=============================================');

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failures.forEach((f) => console.error(`- [${f.suite}] ${f.name}:`, f.error));
  process.exit(1);
} else {
  console.log('\nALL THEME CHALLENGER TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
}
