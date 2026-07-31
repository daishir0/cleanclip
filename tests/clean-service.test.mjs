// Tests for services/clean-service.ts (cleanText and helpers).
// Run with: node tests/clean-service.test.mjs
import { importTs } from './ts-import.mjs';

const { cleanText } = await importTs(new URL('../services/clean-service.ts', import.meta.url).pathname);

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

function eq(name, actual, expected) {
  assert(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log('--- empty / passthrough ---');
eq('empty string', cleanText(''), '');
eq('plain text unchanged', cleanText('hello world'), 'hello world');
eq('japanese unchanged', cleanText('こんにちは 世界'), 'こんにちは 世界');

console.log('--- HTML stripping ---');
eq('strips simple tags', cleanText('<b>bold</b> text'), 'bold text');
eq('br becomes newline', cleanText('line1<br>line2'), 'line1\nline2');
eq('br with slash becomes newline', cleanText('line1<br />line2'), 'line1\nline2');
eq('closing p becomes newline', cleanText('<p>para1</p><p>para2</p>'), 'para1\npara2');
eq('strips anchor keeps text', cleanText('<a href="https://x.example">link</a>'), 'link');

console.log('--- HTML entities ---');
eq('amp decoded', cleanText('a &amp; b'), 'a & b');
eq('nbsp becomes space', cleanText('a&nbsp;b'), 'a b');
eq('lt/gt decoded', cleanText('1 &lt; 2 &gt; 0'), '1 < 2 > 0');
eq('decimal entity', cleanText('&#65;BC'), 'ABC');
eq('hex entity', cleanText('&#x41;BC'), 'ABC');
eq('unknown entity preserved', cleanText('&unknownent;'), '&unknownent;');

console.log('--- invisible characters ---');
eq('zero-width space removed', cleanText('a​b'), 'ab');
eq('BOM removed', cleanText('﻿hello'), 'hello');
eq('soft hyphen removed', cleanText('co­operate'), 'cooperate');

console.log('--- whitespace normalization ---');
eq('multiple spaces collapsed', cleanText('a    b'), 'a b');
eq('tabs collapsed to space', cleanText('a\t\tb'), 'a b');
eq('CRLF normalized', cleanText('a\r\nb'), 'a\nb');
eq('3+ newlines collapse to 2', cleanText('a\n\n\n\nb'), 'a\n\nb');
eq('lines trimmed', cleanText('  a  \n  b  '), 'a\nb');
eq('overall trim', cleanText('\n\n  hello  \n\n'), 'hello');

console.log('--- combined real-world case ---');
{
  const input = '<div>Hello&nbsp;&amp;&nbsp;welcome!<br>  Second​ line  </div>';
  eq('html+entities+invisible+whitespace', cleanText(input), 'Hello & welcome!\nSecond line');
}

console.log('\n=================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('=================================');
process.exit(failed > 0 ? 1 : 0);
