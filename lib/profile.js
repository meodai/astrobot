// lib/profile.js
const fs = require('node:fs');
const paths = require('./paths.js');

function load() {
  try {
    return JSON.parse(fs.readFileSync(paths.profilesPath(), 'utf8'));
  } catch {
    return {};
  }
}

function save(model, data) {
  const store = load();
  store[model] = data;
  store._default = model;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return store;
}

function get(model) {
  const store = load();
  return store[model] && model !== '_default' ? store[model] : null;
}

function resolve(model) {
  const store = load();
  if (model) {
    // Explicit model: only its own identity, else stay silent (no borrowing).
    return store[model] && model !== '_default' ? { model, data: store[model] } : null;
  }
  // Model omitted (e.g. after /clear): fall back to the most-recently-born.
  const def = store._default;
  if (def && store[def]) return { model: def, data: store[def] };
  return null;
}

function setHavoc(model, on) {
  const store = load();
  if (!store[model] || model === '_default') return false;
  store[model].havoc = !!on;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return true;
}

module.exports = { load, save, get, resolve, setHavoc };
