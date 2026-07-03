/**
 * svg-to-png.js — Convert SVG strings to PNG files using browser Canvas.
 *
 * Replaces `sharp` for the SVG→PNG use case. Requires an already-launched
 * browser instance (from cdp-browser.js). Zero npm dependencies.
 *
 * Usage:
 *   const { launch } = require('./cdp-browser');
 *   const { svgToPng } = require('./svg-to-png');
 *   const browser = await launch({ executablePath: '...' });
 *   await svgToPng(browser, svgString, 'output.png');
 *   await svgToPng(browser, svgString, 'output.png', 200, 200); // explicit size
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Render an SVG string to a PNG file using the browser's Canvas API.
 *
 * @param {object} browser - CDPBrowser instance (from cdp-browser.js launch())
 * @param {string} svgString - Raw SVG markup
 * @param {string} outPath - Output PNG file path
 * @param {number} [width] - Output width (defaults to SVG's intrinsic width)
 * @param {number} [height] - Output height (defaults to SVG's intrinsic height)
 * @returns {Promise<string>} The outPath
 */
async function svgToPng(browser, svgString, outPath, width, height) {
  const page = await browser.newPage();
  try {
    // Encode SVG as base64 data URL to avoid any escaping issues
    const base64Svg = Buffer.from(svgString).toString('base64');
    const dataUrl = 'data:image/svg+xml;base64,' + base64Svg;

    // Navigate to a blank page and use Canvas to render the SVG
    await page.goto('about:blank');

    const base64Png = await page.evaluate(async (svgDataUrl, w, h) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w || img.naturalWidth;
          canvas.height = h || img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Export as PNG base64
          const pngUrl = canvas.toDataURL('image/png');
          resolve(pngUrl.split(',')[1]);
        };
        img.onerror = () => reject(new Error('Failed to load SVG into Image element'));
        img.src = svgDataUrl;
      });
    }, dataUrl, width || 0, height || 0);

    // Write the PNG buffer to disk
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(base64Png, 'base64'));

    return outPath;
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { svgToPng };
