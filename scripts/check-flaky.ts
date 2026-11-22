// Reads every flaky.json the run hooks wrote (one per shard in CI) and lists the tests that
// passed only after a retry. Exits 1 when FAIL_ON_FLAKY=true, so a team can turn flakes into failures.
import { globSync, readFileSync } from 'node:fs';

interface FlakyTest {
  spec: string;
  title: string;
  attempts: number;
}

const files = globSync(process.argv[2] ?? 'cypress/reports/**/flaky.json');
const flaky: FlakyTest[] = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as FlakyTest[]);

if (flaky.length === 0) {
  console.log(`No flaky tests (${files.length} result file(s) read).`);
  process.exit(0);
}
console.log(`${flaky.length} test(s) passed only after a retry:`);
for (const f of flaky) console.log(`  - ${f.spec} > ${f.title} (attempt ${f.attempts})`);
if (process.env.FAIL_ON_FLAKY === 'true') process.exit(1);
