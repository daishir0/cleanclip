// Tests for utils/categories.ts (category grouping logic).
// Run with: node tests/categories.test.mjs
import { importTs } from './ts-import.mjs';

const { groupByCategory, listCategories, normalizeCategory } =
  await importTs(new URL('../utils/categories.ts', import.meta.url).pathname);

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

console.log('--- normalizeCategory ---');
assert('plain name kept', normalizeCategory('銀行') === '銀行');
assert('whitespace trimmed', normalizeCategory('  仕事  ') === '仕事');
assert('empty -> undefined', normalizeCategory('') === undefined);
assert('spaces only -> undefined', normalizeCategory('   ') === undefined);
assert('non-string -> undefined', normalizeCategory(42) === undefined);
assert('undefined -> undefined', normalizeCategory(undefined) === undefined);

console.log('--- groupByCategory: basic split ---');
{
  const entries = [
    { id: 'a', category: undefined },
    { id: 'b', category: '銀行' },
    { id: 'c' },
    { id: 'd', category: '仕事' },
    { id: 'e', category: '銀行' },
  ];
  const g = groupByCategory(entries);
  assert('uncategorized keeps order', g.uncategorized.map(e => e.id).join() === 'a,c');
  assert('two categories found', g.categories.length === 2);
  const bank = g.categories.find(c => c.name === '銀行');
  assert('category members in order', bank.entries.map(e => e.id).join() === 'b,e');
}

console.log('--- groupByCategory: category names sorted ---');
{
  const entries = [
    { id: '1', category: 'zebra' },
    { id: '2', category: 'apple' },
    { id: '3', category: 'mango' },
  ];
  const g = groupByCategory(entries);
  assert('alphabetical order', g.categories.map(c => c.name).join() === 'apple,mango,zebra');
}

console.log('--- groupByCategory: whitespace category = uncategorized ---');
{
  const entries = [
    { id: '1', category: '  ' },
    { id: '2', category: '' },
  ];
  const g = groupByCategory(entries);
  assert('blank categories fall back to uncategorized', g.uncategorized.length === 2 && g.categories.length === 0);
}

console.log('--- groupByCategory: trimmed names merge ---');
{
  const entries = [
    { id: '1', category: '仕事' },
    { id: '2', category: ' 仕事 ' },
  ];
  const g = groupByCategory(entries);
  assert('same name after trim merges into one', g.categories.length === 1 && g.categories[0].entries.length === 2);
}

console.log('--- groupByCategory: empty input ---');
{
  const g = groupByCategory([]);
  assert('empty in, empty out', g.uncategorized.length === 0 && g.categories.length === 0);
}

console.log('--- listCategories ---');
{
  const entries = [
    { id: '1', category: 'b' },
    { id: '2', category: 'a' },
    { id: '3' },
  ];
  assert('names only, sorted', listCategories(entries).join() === 'a,b');
}

console.log('\n=================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('=================================');
process.exit(failed > 0 ? 1 : 0);
