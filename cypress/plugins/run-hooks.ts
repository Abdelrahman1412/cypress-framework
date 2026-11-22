import { appendFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
// The reporter's own plugin registers before:run/after:run; Cypress keeps only one
// listener per event, so its hooks are called from here instead.
import { afterRunHook, beforeRunHook } from 'cypress-mochawesome-reporter/lib/index.js';

export interface FlakyTest {
  spec: string;
  title: string;
  attempts: number;
}

const flakyFile = path.resolve('cypress/reports/flaky.json');

export function registerRunHooks(on: Cypress.PluginEvents): void {
  const flaky: FlakyTest[] = [];

  on('task', {
    table(rows: Record<string, unknown>[]) {
      console.table(rows);
      return null;
    },
  });

  on('before:run', async (details) => {
    await beforeRunHook(details);
  });

  on('after:spec', (spec, results) => {
    if (!results) return;
    let anyAttemptFailed = false;
    for (const test of results.tests ?? []) {
      const attempts = test.attempts ?? [];
      if (attempts.some((a) => a.state === 'failed')) anyAttemptFailed = true;
      if (test.state === 'passed' && attempts.length > 1) {
        const entry = { spec: spec.relative, title: test.title.join(' > '), attempts: attempts.length };
        flaky.push(entry);
        console.warn(`\n  FLAKY: "${entry.title}" passed only on attempt ${entry.attempts} (${entry.spec})`);
        if (process.env.GITHUB_ACTIONS) {
          console.log(`::warning file=${entry.spec},title=Flaky test::${entry.title} passed on attempt ${entry.attempts}`);
        }
      }
    }
    // Keep videos only as evidence: a spec where nothing ever failed does not need one.
    if (results.video && !anyAttemptFailed && existsSync(results.video)) rmSync(results.video);
  });

  on('after:run', async (results) => {
    mkdirSync(path.dirname(flakyFile), { recursive: true });
    writeFileSync(flakyFile, `${JSON.stringify(flaky, null, 2)}\n`);
    if (flaky.length) {
      console.warn(`\n  ${flaky.length} test(s) passed only after a retry. See ${path.relative(process.cwd(), flakyFile)}.`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        const rows = flaky.map((f) => `| ${f.spec} | ${f.title} | ${f.attempts} |`).join('\n');
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `\n### Flaky tests (passed after retry)\n\n| Spec | Test | Attempts |\n| --- | --- | --- |\n${rows}\n`,
        );
      }
    }
    if (results && 'runs' in results) await afterRunHook();
  });
}
