/**
 * rasterize.js — High-level API for rasterizing icons and gradients to PNG.
 *
 * Replaces the react + react-dom + react-icons + sharp pipeline.
 * Uses pre-extracted SVG data (icons.js) + browser Canvas (svg-to-png.js).
 *
 * Usage in agent's build.js:
 *   const { launch } = require('./cdp-browser');
 *   const { findChromium } = require('./chromium-finder');
 *   const { iconPng, gradientPng, iconSvg, listIcons } = require('./rasterize');
 *
 *   const browser = await launch({ executablePath: findChromium().executablePath });
 *   await iconPng(browser, 'FaHouse', 'ffffff', 256, 'assets/home.png');
 *   await gradientPng(browser, svgString, 'assets/bg.png');
 *   await browser.close();
 */

'use strict';

const { svgToPng } = require('./svg-to-png');
const icons = require('./icons');

function normalizeHexColor(color) {
  const raw = String(color || '000000').trim().replace(/^#/, '');
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) {
    throw new Error(`Invalid icon color "${color}". Use hex without '#', e.g. "4472c4".`);
  }
  return `#${raw}`;
}

/**
 * Build an SVG string for a named icon.
 * @param {string} name - Icon export name (e.g. 'FaHouse', 'MdSearch')
 * @param {string} color - Hex color WITHOUT '#' (e.g. '4472c4')
 * @param {number|string} [size=256] - Icon size in pixels
 * @returns {string} SVG markup
 */
function iconSvg(name, color, size) {
  size = Number(size) || 256;
  const icon = icons[name];
  if (!icon) {
    const available = Object.keys(icons).slice(0, 20).join(', ') + '...';
    throw new Error(
      `Unknown icon: "${name}". Use listIcons() to see available icons.\nFirst 20: ${available}`
    );
  }

  const svgColor = normalizeHexColor(color);

  // New format: preserve the original react-icons SVG attributes and body so
  // stroke icons, fill="none" paths, circles, lines, etc. render faithfully.
  if (icon.attrs && icon.body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" ${icon.attrs} ` +
      `width="${size}" height="${size}" color="${svgColor}">${icon.body}</svg>`;
  }

  // Backward compatibility for older generated icons.js files.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="${size}" height="${size}">` +
    (icon.paths
      ? icon.paths.map(p => `<path fill="${svgColor}" d="${p}"/>`).join('')
      : `<path fill="${svgColor}" d="${icon.path}"/>`) +
    `</svg>`;
}

/**
 * Rasterize a named icon to PNG.
 * @param {object} browser - CDPBrowser instance
 * @param {string} name - Icon export name
 * @param {string} color - Hex color WITHOUT '#'
 * @param {number|string} size - Icon size in pixels
 * @param {string} outPath - Output PNG path
 * @returns {Promise<string>} outPath
 */
async function iconPng(browser, name, color, size, outPath) {
  const svg = iconSvg(name, color, size);
  return svgToPng(browser, svg, outPath, Number(size), Number(size));
}

/**
 * Rasterize an arbitrary SVG string (e.g. gradient) to PNG.
 * @param {object} browser - CDPBrowser instance
 * @param {string} svgString - Full SVG markup
 * @param {string} outPath - Output PNG path
 * @param {number} [width] - Output width
 * @param {number} [height] - Output height
 * @returns {Promise<string>} outPath
 */
async function gradientPng(browser, svgString, outPath, width, height) {
  return svgToPng(browser, svgString, outPath, width, height);
}

/**
 * List all available icon names.
 * @param {string} [prefix] - Optional filter prefix (e.g. 'Fa', 'Md')
 * @returns {string[]} Array of icon names
 */
function listIcons(prefix) {
  const all = Object.keys(icons);
  if (!prefix) return all;
  return all.filter(n => n.startsWith(prefix));
}

module.exports = { iconSvg, iconPng, gradientPng, listIcons };
