import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
  'adversarial_challenger_m1_theme.test.tsx',
  'primitives_adversarial.test.tsx',
  'primitives_interactive_adversarial.test.tsx',
  'adversarial_challenger_m2.test.tsx',
  'adversarial_challenger_m2_empirical.test.tsx',
  'challenger_m2_deep_stress.test.tsx',
  'challenger_m3_frontend.test.tsx',
  'adversarial_challenger_m3_empirical_deep.test.tsx',
  'adversarial_challenger_m3_empirical.test.tsx',
  'adversarial_challenger_m4_ingestion.test.tsx',
  'empirical_m4_deep_stress.test.tsx',
  'adversarial_challenger_m4_deep_e2e.test.tsx',
  'adversarial_challenger_m5_e2e_4tier.test.tsx',
  'adversarial_challenger_m5_empirical_deep.test.tsx',
];

for (const file of testFiles) {
  const testEntry = path.join(__dirname, file);
  const outfile = path.join(__dirname, file.replace(/\.tsx?$/, '.bundle.cjs'));

  console.log(`\n======================================================`);
  console.log(`Compiling and executing: ${file}`);
  console.log(`======================================================`);

  try {
    await build({
      entryPoints: [testEntry],
      outfile,
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      jsx: 'automatic',
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
      },
      external: [],
    });

    const exitCode = await new Promise((resolve) => {
      const child = spawn(process.execPath, [outfile], {
        stdio: 'inherit',
        env: process.env,
      });

      child.on('close', (code) => {
        resolve(code ?? 0);
      });
    });

    if (exitCode !== 0) {
      console.error(`Suite ${file} failed with exit code ${exitCode}`);
      process.exit(exitCode);
    }
  } catch (err) {
    console.error(`Failed executing ${file}:`, err);
    process.exit(1);
  }
}

console.log('\n======================================================');
console.log('ALL TEST SUITES EXECUTED AND PASSED WITH ZERO ERRORS!');
console.log('======================================================\n');
