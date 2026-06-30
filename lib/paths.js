// lib/paths.js
const os = require('node:os');
const path = require('node:path');

function dir() {
  return process.env.ASTROBOT_DIR || path.join(os.homedir(), '.claude', 'astrobot');
}
function profilesPath() {
  return path.join(dir(), 'profiles.json');
}
module.exports = { dir, profilesPath };
