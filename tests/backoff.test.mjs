// Tests for utils/backoff.ts (sync retry backoff logic).
// Run with: node tests/backoff.test.mjs
import { importTs } from './ts-import.mjs';

const {
  nextRetryDelay,
  shouldRetrySync,
  SYNC_RETRY_BASE_MS,
  SYNC_RETRY_MAX_MS,
  SYNC_RETRY_MAX_ATTEMPTS,
} = await importTs(new URL('../utils/backoff.ts', import.meta.url).pathname);

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${name}${detail ? ' - ' + detail : ''}`);
  }
}

console.log('--- nextRetryDelay: exponential growth ---');
assert('attempt 0 = base', nextRetryDelay(0) === SYNC_RETRY_BASE_MS);
assert('attempt 1 = 2x base', nextRetryDelay(1) === SYNC_RETRY_BASE_MS * 2);
assert('attempt 2 = 4x base', nextRetryDelay(2) === SYNC_RETRY_BASE_MS * 4);
assert('attempt 5 = 32x base', nextRetryDelay(5) === SYNC_RETRY_BASE_MS * 32);

console.log('--- nextRetryDelay: capped at max ---');
assert('large attempt capped', nextRetryDelay(20) === SYNC_RETRY_MAX_MS);
assert('cap respects custom max', nextRetryDelay(20, 1000, 8000) === 8000);

console.log('--- nextRetryDelay: defensive inputs ---');
assert('negative attempt treated as 0', nextRetryDelay(-3) === SYNC_RETRY_BASE_MS);
assert('fractional attempt floored', nextRetryDelay(1.9) === SYNC_RETRY_BASE_MS * 2);
assert('NaN treated as 0', nextRetryDelay(NaN) === SYNC_RETRY_BASE_MS);
assert('Infinity capped at max', nextRetryDelay(Infinity) === SYNC_RETRY_MAX_MS);

console.log('--- retry schedule stays reasonable ---');
{
  let total = 0;
  for (let a = 0; a < SYNC_RETRY_MAX_ATTEMPTS; a++) total += nextRetryDelay(a);
  assert('full retry schedule under 10 min', total <= 600_000, `total=${total}`);
}

console.log('--- shouldRetrySync: only transient errors retried ---');
assert('error retried', shouldRetrySync('error') === true);
assert('keyMismatch not retried', shouldRetrySync('keyMismatch') === false);
assert('quotaExceeded not retried', shouldRetrySync('quotaExceeded') === false);
assert('unavailable not retried', shouldRetrySync('unavailable') === false);
assert('noop not retried', shouldRetrySync('noop') === false);
assert('ok not retried', shouldRetrySync('ok') === false);

console.log('\n=================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('=================================');
process.exit(failed > 0 ? 1 : 0);
