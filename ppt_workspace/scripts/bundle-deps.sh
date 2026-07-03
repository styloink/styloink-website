#!/usr/bin/env bash
# Maintainer script: refresh node_modules + icons.js for the pptx skill.
#
# This produces a slim (~7MB) bundle containing:
#   - pptxgenjs + its runtime deps (jszip, pako, image-size)
#   - scripts/icons.js (pre-extracted SVG path data from react-icons)
#
# Playwright, sharp, react, react-dom, and react-icons are NOT bundled.
# Their functionality is replaced by:
#   - cdp-browser.js (minimal CDP client, zero deps)
#   - svg-to-png.js (browser Canvas SVG→PNG)
#   - rasterize.js + icons.js (icon/gradient rasterization)
#
# Requirements: node, npm. Run from anywhere — it cd's to the skill root.
# To regenerate icons.js, react + react-dom + react-icons must be available
# (installed in a temp location or globally).

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR"

# ─── 1. Clean install pptxgenjs only ────────────────────────────────
echo "[bundle-deps] installing pptxgenjs..."
rm -rf node_modules
npm install --no-audit --no-fund --ignore-scripts

# ─── 2. Trim unnecessary files from node_modules ────────────────────
echo "[bundle-deps] trimming node_modules..."

# Delete @types (TypeScript types — not needed at runtime)
rm -rf node_modules/@types

# Delete pptxgenjs dist files we don't need (ESM, browser bundle, sourcemaps, types)
cd node_modules/pptxgenjs
rm -f dist/pptxgen.es.js dist/pptxgen.bundle.js dist/pptxgen.bundle.js.map \
      dist/pptxgen.min.js.map dist/pptxgen.cjs.js.map 2>/dev/null || true
rm -rf types
cd "$SKILL_DIR"

# Delete .d.ts files, .map files, README/LICENSE/CHANGELOG across all packages
find node_modules -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "*.map" -delete 2>/dev/null || true
find node_modules \( -name "README*" -o -name "CHANGELOG*" \) -delete 2>/dev/null || true

# ─── 3. Regenerate icons.js (if react-icons available) ──────────────
if [ -d "node_modules/react-icons" ] || command -v react-icons >/dev/null 2>&1; then
  echo "[bundle-deps] regenerating icons.js from existing react-icons..."
  node scripts/extract-icons.js
elif [ -f "scripts/icons.js" ]; then
  echo "[bundle-deps] icons.js already exists, skipping extraction"
  echo "[bundle-deps] (to regenerate: npm install react react-dom react-icons, then re-run)"
else
  echo "[bundle-deps] WARNING: no react-icons found and no existing icons.js"
  echo "[bundle-deps] Install react-icons to generate: "
  echo "[bundle-deps]   npm install --no-save react react-dom react-icons"
  echo "[bundle-deps]   node scripts/extract-icons.js"
fi

# Remove react/react-dom/react-icons if they were pulled in as transitive deps
rm -rf node_modules/react node_modules/react-dom node_modules/react-icons \
       node_modules/scheduler 2>/dev/null || true

# ─── 4. Smoke test ──────────────────────────────────────────────────
echo "[bundle-deps] smoke test..."
node -e "require('./node_modules/pptxgenjs'); console.log('[bundle-deps] pptxgenjs OK');"

# ─── 5. Done ────────────────────────────────────────────────────────
SIZE="$(du -sh node_modules | awk '{print $1}')"
ICONS_SIZE="$(du -sh scripts/icons.js 2>/dev/null | awk '{print $1}' || echo 'N/A')"
echo "[bundle-deps] OK — node_modules: ${SIZE}, icons.js: ${ICONS_SIZE}"
echo "[bundle-deps] next: git add node_modules scripts/icons.js && git commit"
