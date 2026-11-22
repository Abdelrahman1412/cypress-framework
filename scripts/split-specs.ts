// Splits the e2e specs into N balanced shards without Cypress Cloud.
// Weight = number of it(...) calls, so shards get similar test counts; ties keep a stable order.
// Usage: node scripts/split-specs.ts <shardIndex 1..N> <totalShards>   -> prints a comma-separated spec list
import { appendFileSync, globSync, readFileSync } from 'node:fs';

const [index, total] = process.argv.slice(2).map(Number);
if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || index > total) {
  console.error('Usage: node scripts/split-specs.ts <shardIndex 1..N> <totalShards>');
  process.exit(2);
}

const specs = globSync('cypress/e2e/**/*.cy.ts')
  .sort()
  .map((file) => ({ file, weight: Math.max(1, (readFileSync(file, 'utf8').match(/\bit(Live)?\(/g) ?? []).length) }))
  .sort((a, b) => b.weight - a.weight || a.file.localeCompare(b.file));

const shards = Array.from({ length: total }, () => ({ weight: 0, files: [] as string[] }));
for (const spec of specs) {
  const lightest = shards.reduce((min, s) => (s.weight < min.weight ? s : min));
  lightest.files.push(spec.file);
  lightest.weight += spec.weight;
}

const mine = shards[index - 1].files.sort();
if (mine.length === 0) {
  console.error(`Shard ${index}/${total} has no specs; lower the shard count.`);
  process.exit(1);
}
const list = mine.join(',');
console.log(list);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `specs=${list}\n`);
