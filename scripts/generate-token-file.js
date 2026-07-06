// Runs before packaging. Reads GH_TOKEN the same way electron-builder does
// (from electron-builder.env in the project root, or a real env var if set)
// and writes it into electron/embedded-token.json, which gets bundled into
// the app via the "electron/**/*" entry in package.json's "files" list.
//
// Security note: this means the token ships inside the built app. Anyone with
// access to the installed app's files could extract it. This is a deliberate
// tradeoff for personal/internal use with a private update repo - do not use
// this approach if you're distributing to people you don't trust, or use a
// token scoped as narrowly as possible (read-only access to just this repo).

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

const envFile = loadEnvFile(path.join(__dirname, '..', 'electron-builder.env'));
const token = process.env.GH_TOKEN || envFile.GH_TOKEN;

if (!token) {
  console.warn(
    'WARNING: No GH_TOKEN found (checked electron-builder.env and process.env). ' +
    'Auto-update against the private repo will not work in this build. ' +
    'Set GH_TOKEN in electron-builder.env if you want update checks to work.'
  );
}

const outPath = path.join(__dirname, '..', 'electron', 'embedded-token.json');
fs.writeFileSync(outPath, JSON.stringify({ token: token || null }, null, 2));
console.log(`Wrote ${outPath} (token ${token ? 'present' : 'MISSING'})`);
