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
  if (typeof model !== 'string' || model.startsWith('_')) {
    throw new Error(`"${model}" is a reserved key`);
  }
  const store = load();
  store[model] = data;
  store._default = model;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return store;
}

function get(model) {
  const store = load();
  return store[model] && !model.startsWith('_') ? store[model] : null;
}

function resolve(model) {
  const store = load();
  if (model) {
    // Explicit model: only its own identity, else stay silent (no borrowing).
    return store[model] && !model.startsWith('_') ? { model, data: store[model] } : null;
  }
  // Model omitted (e.g. after /clear): fall back to the most-recently-born.
  const def = store._default;
  if (def && store[def]) return { model: def, data: store[def] };
  return null;
}

function list() {
  const store = load();
  return Object.keys(store).filter((k) => !k.startsWith('_'));
}

function setHavoc(model, on) {
  const store = load();
  if (!store[model] || model.startsWith('_')) return false;
  store[model].havoc = !!on;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return true;
}

// --- User birth (reserved key _user) ---

function setUser(data) {
  const store = load();
  store._user = data;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return true;
}

function getUser() {
  return load()._user || null;
}

function clearUser() {
  const store = load();
  delete store._user;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return true;
}

module.exports = { load, save, get, resolve, list, setHavoc, setUser, getUser, clearUser };
