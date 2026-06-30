// test/package.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const binSource = readFileSync(resolve(root, 'bin/astrobot.js'), 'utf8');
const firstLine = binSource.split('\n')[0];

test('bin/astrobot.js has shebang as first line', () => {
  assert.equal(firstLine, '#!/usr/bin/env node');
});

test('package.json name is scoped @meodai/astrobot', () => {
  assert.equal(pkg.name, '@meodai/astrobot');
});

test('package.json bin.astrobot points to bin/astrobot.js', () => {
  assert.equal(pkg.bin?.astrobot, 'bin/astrobot.js');
});

test('package.json files includes bin/', () => {
  assert.ok(pkg.files.includes('bin/'), 'files should include bin/');
});

test('package.json files includes lib/', () => {
  assert.ok(pkg.files.includes('lib/'), 'files should include lib/');
});

test('package.json files includes vendor/astronomy.js', () => {
  assert.ok(pkg.files.includes('vendor/astronomy.js'), 'files should include vendor/astronomy.js');
});

test('package.json files includes vendor/cities.json', () => {
  assert.ok(pkg.files.includes('vendor/cities.json'), 'files should include vendor/cities.json');
});

test('package.json is not private', () => {
  assert.ok(!pkg.private, 'package should not be private');
});
