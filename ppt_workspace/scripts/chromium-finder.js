/**
 * chromium-finder — discover a usable Chromium-based browser without
 * downloading a bundled browser at runtime.
 *
 * Mirrors the discovery strategy of the accio desktop client so the skill and
 * the host app behave consistently. accio's source lives in phoenix-pc and is
 * NOT shipped to user machines, so the relevant logic is reimplemented here.
 * Reference (read-only, for future syncs):
 *   - packages/sdk/src/browser/discovery/chromium-downloader.ts   (accio builtin scan)
 *   - packages/sdk/src/browser/discovery/installed-browsers.ts    (system browser table)
 *   - packages/sdk/src/browser/connection/service.ts:findChromiumExecutable
 *
 * Discovery order (highest priority first):
 *   1. PHOENIX_BROWSER_PATH  — user override, same env var as accio
 *   2. ~/.accio/browser/builtin/...  — Chromium the user already downloaded via accio
 *   3. System Chromium-family browsers (Chrome, Edge, Brave, Chromium, Vivaldi, Opera, Arc)
 *
 * Usage:
 *   // As a module
 *   const { findChromium } = require('./chromium-finder');
 *   const { source, executablePath, displayName } = findChromium();
 *
 *   // As a CLI (used by bootstrap.sh / bootstrap.cmd)
 *   node scripts/chromium-finder.js
 *   // stdout: JSON {source, executablePath, displayName}; exit 0 found, exit 1 not found
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ACCIO_BUILTIN_DIR = path.join(os.homedir(), '.accio', 'browser', 'builtin');

const SYSTEM_CANDIDATES = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    paths: {
      darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'],
      win32: [
        '${PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe',
        '${PROGRAMFILES(X86)}\\Google\\Chrome\\Application\\chrome.exe',
        '${LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe',
      ],
    },
  },
  {
    id: 'chrome-canary',
    name: 'Google Chrome Canary',
    paths: {
      darwin: ['/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'],
      linux: [],
      win32: ['${LOCALAPPDATA}\\Google\\Chrome SxS\\Application\\chrome.exe'],
    },
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    paths: {
      darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      linux: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'],
      win32: [
        '${PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe',
        '${PROGRAMFILES(X86)}\\Microsoft\\Edge\\Application\\msedge.exe',
      ],
    },
  },
  {
    id: 'brave',
    name: 'Brave Browser',
    paths: {
      darwin: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
      linux: ['/usr/bin/brave-browser', '/usr/bin/brave-browser-stable'],
      win32: [
        '${PROGRAMFILES}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        '${LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      ],
    },
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    paths: {
      darwin: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'],
      linux: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable'],
      win32: [
        '${LOCALAPPDATA}\\Vivaldi\\Application\\vivaldi.exe',
        '${PROGRAMFILES}\\Vivaldi\\Application\\vivaldi.exe',
      ],
    },
  },
  {
    id: 'opera',
    name: 'Opera',
    paths: {
      darwin: ['/Applications/Opera.app/Contents/MacOS/Opera'],
      linux: ['/usr/bin/opera', '/snap/bin/opera'],
      win32: [
        '${LOCALAPPDATA}\\Programs\\Opera\\launcher.exe',
        '${PROGRAMFILES}\\Opera\\launcher.exe',
      ],
    },
  },
  {
    id: 'chromium',
    name: 'Chromium',
    paths: {
      darwin: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
      linux: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
      win32: [],
    },
  },
  {
    id: 'arc',
    name: 'Arc',
    paths: {
      darwin: ['/Applications/Arc.app/Contents/MacOS/Arc'],
      linux: [],
      win32: [],
    },
  },
];

function expandEnvVars(p) {
  return p.replace(/\$\{(\w+(?:\(\w+\))?)\}/g, (_, name) => process.env[name] || '');
}

function findAccioBuiltin() {
  if (!fs.existsSync(ACCIO_BUILTIN_DIR)) return null;
  let entries;
  try {
    entries = fs.readdirSync(ACCIO_BUILTIN_DIR);
  } catch {
    return null;
  }

  // Each entry is a versioned dir Playwright created; inside is a platform-named subdir.
  const platform = process.platform;
  for (const entry of entries) {
    const root = path.join(ACCIO_BUILTIN_DIR, entry);
    let stat;
    try { stat = fs.statSync(root); } catch { continue; }
    if (!stat.isDirectory()) continue;

    const candidates = [];
    if (platform === 'darwin') {
      // Playwright lays Chrome-for-Testing out under chrome-mac-arm64 / chrome-mac-x64
      // (the arch suffix matters on Intel Macs). Older bundles used chrome-mac.
      candidates.push(
        path.join(root, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(root, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(root, 'chrome-mac-x64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(root, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        path.join(root, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        path.join(root, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      );
    } else if (platform === 'win32') {
      candidates.push(
        path.join(root, 'chrome-win', 'chrome.exe'),
        path.join(root, 'chrome-win64', 'chrome.exe'),
      );
    } else {
      candidates.push(
        path.join(root, 'chrome-linux', 'chrome'),
        path.join(root, 'chrome-linux64', 'chrome'),
      );
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}

function findSystem() {
  const platform = process.platform;
  for (const cand of SYSTEM_CANDIDATES) {
    const list = cand.paths[platform] || [];
    for (const raw of list) {
      const resolved = expandEnvVars(raw);
      if (resolved && fs.existsSync(resolved)) {
        return { executablePath: resolved, displayName: cand.name };
      }
    }
  }
  return null;
}

/**
 * Synchronous discovery. Returns the first hit in priority order.
 *
 * @returns {{source: 'env'|'accio'|'system'|null, executablePath: string|null, displayName: string|null}}
 */
function findChromium() {
  const envPath = process.env.PHOENIX_BROWSER_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { source: 'env', executablePath: envPath, displayName: 'PHOENIX_BROWSER_PATH' };
  }

  const accio = findAccioBuiltin();
  if (accio) {
    return { source: 'accio', executablePath: accio, displayName: 'accio builtin Chromium' };
  }

  const system = findSystem();
  if (system) {
    return { source: 'system', executablePath: system.executablePath, displayName: system.displayName };
  }

  return { source: null, executablePath: null, displayName: null };
}

module.exports = { findChromium };

if (require.main === module) {
  const result = findChromium();
  process.stdout.write(JSON.stringify(result));
  process.exit(result.executablePath ? 0 : 1);
}
