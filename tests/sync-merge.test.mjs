// Pure-function tests for the merge logic (no React Native dependency).
// Run with: node tests/sync-merge.test.mjs

import { gcm } from '../node_modules/@noble/ciphers/aes.js';
import { utf8ToBytes, bytesToUtf8 } from '../node_modules/@noble/ciphers/utils.js';

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

function isTombstone(e) {
  return typeof e.deletedAt === 'number' && e.deletedAt > 0;
}

function isLocalOnly(e) {
  return e.localOnly === true;
}

function mergeEntries(local, cloud) {
  const byId = new Map();
  for (const e of local) byId.set(e.id, e);
  for (const cloudEntry of cloud) {
    const localEntry = byId.get(cloudEntry.id);
    if (!localEntry) {
      byId.set(cloudEntry.id, cloudEntry);
      continue;
    }
    const winner = cloudEntry.updatedAt >= localEntry.updatedAt ? cloudEntry : localEntry;
    const deletedAt = Math.max(localEntry.deletedAt ?? 0, cloudEntry.deletedAt ?? 0);
    const localOnly = (localEntry.localOnly === true) || (cloudEntry.localOnly === true);
    const merged = { ...winner };
    if (deletedAt > 0) merged.deletedAt = deletedAt;
    if (localOnly) merged.localOnly = true;
    byId.set(cloudEntry.id, merged);
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function entriesForCloud(all) {
  return all.filter(e => !isLocalOnly(e)).map(e => {
    const out = { ...e };
    delete out.localOnly;
    return out;
  });
}

console.log('--- mergeEntries: local-only id retained ---');
{
  const local = [{ id: 'a', name: 'A', content: 'x', masked: false, createdAt: 1, updatedAt: 10 }];
  const cloud = [];
  const r = mergeEntries(local, cloud);
  assert('keeps local-only entry', r.length === 1 && r[0].id === 'a');
}

console.log('--- mergeEntries: cloud-only id added ---');
{
  const local = [];
  const cloud = [{ id: 'b', name: 'B', content: 'y', masked: false, createdAt: 1, updatedAt: 20 }];
  const r = mergeEntries(local, cloud);
  assert('adds cloud-only entry', r.length === 1 && r[0].id === 'b');
}

console.log('--- mergeEntries: cloud newer wins ---');
{
  const local = [{ id: 'c', name: 'L', content: 'l', masked: false, createdAt: 1, updatedAt: 10 }];
  const cloud = [{ id: 'c', name: 'C', content: 'c', masked: false, createdAt: 1, updatedAt: 20 }];
  const r = mergeEntries(local, cloud);
  assert('newer cloud wins', r.length === 1 && r[0].name === 'C');
}

console.log('--- mergeEntries: local newer wins ---');
{
  const local = [{ id: 'd', name: 'L', content: 'l', masked: false, createdAt: 1, updatedAt: 30 }];
  const cloud = [{ id: 'd', name: 'C', content: 'c', masked: false, createdAt: 1, updatedAt: 20 }];
  const r = mergeEntries(local, cloud);
  assert('newer local wins', r.length === 1 && r[0].name === 'L');
}

console.log('--- mergeEntries: tie -> cloud wins (deterministic) ---');
{
  const local = [{ id: 'e', name: 'L', content: 'l', masked: false, createdAt: 1, updatedAt: 25 }];
  const cloud = [{ id: 'e', name: 'C', content: 'c', masked: false, createdAt: 1, updatedAt: 25 }];
  const r = mergeEntries(local, cloud);
  assert('tie cloud wins', r.length === 1 && r[0].name === 'C');
}

console.log('--- mergeEntries: tombstone (cloud delete, local update) ---');
{
  const local = [{ id: 'f', name: 'L', content: 'l', masked: false, createdAt: 1, updatedAt: 50 }];
  const cloud = [{ id: 'f', name: 'L', content: 'l', masked: false, createdAt: 1, updatedAt: 30, deletedAt: 60 }];
  const r = mergeEntries(local, cloud);
  assert('tombstone propagates', r.length === 1 && isTombstone(r[0]));
  assert('tombstone deletedAt = max', r[0].deletedAt === 60);
}

console.log('--- mergeEntries: tombstone (local delete, cloud update) ---');
{
  const local = [{ id: 'g', name: 'L', content: 'l', masked: false, createdAt: 1, updatedAt: 30, deletedAt: 40 }];
  const cloud = [{ id: 'g', name: 'C', content: 'c', masked: false, createdAt: 1, updatedAt: 50 }];
  const r = mergeEntries(local, cloud);
  assert('tombstone preserved despite cloud update', isTombstone(r[0]));
}

console.log('--- mergeEntries: ordering by updatedAt desc ---');
{
  const local = [
    { id: 'h1', name: 'A', content: 'x', masked: false, createdAt: 1, updatedAt: 100 },
    { id: 'h2', name: 'B', content: 'y', masked: false, createdAt: 1, updatedAt: 200 },
  ];
  const r = mergeEntries(local, []);
  assert('sorted desc', r[0].id === 'h2' && r[1].id === 'h1');
}

console.log('--- entriesForCloud: localOnly excluded ---');
{
  const all = [
    { id: 'i1', name: 'pub', content: 'x', masked: false, createdAt: 1, updatedAt: 1, localOnly: false },
    { id: 'i2', name: 'card', content: '1234', masked: true, createdAt: 1, updatedAt: 1, localOnly: true },
  ];
  const r = entriesForCloud(all);
  assert('localOnly stripped from upload', r.length === 1 && r[0].id === 'i1');
  assert('localOnly flag erased on push', r[0].localOnly === undefined);
}

console.log('--- tombstone wipe: name/content empty after delete, merge still consistent ---');
{
  // Simulate the wipe that AppContext.deleteEntry performs
  function wipe(e) {
    const out = { id: e.id, name: '', content: '', masked: false, createdAt: e.createdAt, updatedAt: e.updatedAt, deletedAt: e.deletedAt };
    if (e.localOnly) out.localOnly = true;
    return out;
  }
  const original = { id: 't1', name: 'card', content: '4111-1111-1111-1111', masked: true, createdAt: 1, updatedAt: 100 };
  const tombstoned = wipe({ ...original, deletedAt: 200, updatedAt: 200 });
  assert('wiped tombstone has empty name', tombstoned.name === '');
  assert('wiped tombstone has empty content', tombstoned.content === '');
  assert('wiped tombstone keeps deletedAt', tombstoned.deletedAt === 200);

  // Cloud has the un-wiped older version
  const cloud = [original];
  const local = [tombstoned];
  const merged = mergeEntries(local, cloud);
  assert('merge picks the wiped tombstone (newer updatedAt)', merged[0].name === '' && isTombstone(merged[0]));
  assert('merge does not resurrect content', merged[0].content === '');
}

console.log('--- AES-256-GCM round-trip ---');
{
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) key[i] = i;
  const iv = new Uint8Array(12);
  for (let i = 0; i < 12; i++) iv[i] = i + 100;
  const plain = 'クレジットカード 1234-5678-9012-3456';
  const cipher = gcm(key, iv);
  const ct = cipher.encrypt(utf8ToBytes(plain));
  const cipher2 = gcm(key, iv);
  const back = bytesToUtf8(cipher2.decrypt(ct));
  assert('round-trip restores plaintext', back === plain);
}

console.log('--- AES-256-GCM tamper detection ---');
{
  const key = new Uint8Array(32);
  const iv = new Uint8Array(12);
  for (let i = 0; i < 12; i++) iv[i] = i;
  const plain = 'sensitive';
  const cipher = gcm(key, iv);
  const ct = cipher.encrypt(utf8ToBytes(plain));
  ct[0] ^= 0xff;
  let threw = false;
  try {
    const cipher2 = gcm(key, iv);
    cipher2.decrypt(ct);
  } catch {
    threw = true;
  }
  assert('tampered ciphertext rejected', threw);
}

console.log('\n=================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('=================================');

if (failed > 0) process.exit(1);
process.exit(0);
