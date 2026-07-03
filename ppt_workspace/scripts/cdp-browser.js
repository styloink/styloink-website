/**
 * cdp-browser.js — Minimal CDP (Chrome DevTools Protocol) client.
 *
 * Drop-in replacement for the Playwright subset used by html2pptx.js and
 * thumbnail_html.py. Zero npm dependencies — uses Node.js built-in modules only.
 *
 * Communicates with Chromium via --remote-debugging-pipe (stdin/stdout on fd 3/4).
 *
 * Exposed API (mirrors Playwright):
 *   const { launch } = require('./cdp-browser');
 *   const browser = await launch({ executablePath, env, headless });
 *   const page = await browser.newPage();
 *   const ctx = await browser.newContext({ viewport: { width, height } });
 *   const page2 = await ctx.newPage();
 *   await page.goto(url, { waitUntil });
 *   const result = await page.evaluate(fn, ...args);
 *   await page.setViewportSize({ width, height });
 *   await page.screenshot({ path, fullPage });
 *   page.on('console', msg => console.log(msg.text()));
 *   await page.close();
 *   await ctx.close();
 *   await browser.close();
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

// ─── CDP Pipe Transport ────────────────────────────────────────────────────

class CDPTransport {
  constructor(proc) {
    this._proc = proc;
    this._pipe_in = proc.stdio[3];   // we write commands here
    this._pipe_out = proc.stdio[4];  // we read responses/events here
    this._nextId = 1;
    this._callbacks = new Map();      // id → { resolve, reject }
    this._eventHandlers = new Map();  // method → [cb, ...]
    this._buffer = '';

    this._pipe_out.setEncoding('utf8');
    this._pipe_out.on('data', (chunk) => this._onData(chunk));
    this._pipe_out.on('end', () => this._onClose());
  }

  _onData(chunk) {
    this._buffer += chunk;
    // CDP pipe protocol: messages separated by \0
    let idx;
    while ((idx = this._buffer.indexOf('\0')) !== -1) {
      const raw = this._buffer.slice(0, idx);
      this._buffer = this._buffer.slice(idx + 1);
      if (!raw) continue;
      let msg;
      try { msg = JSON.parse(raw); } catch (_) { continue; }
      this._dispatch(msg);
    }
  }

  _dispatch(msg) {
    if (msg.id !== undefined) {
      // Response to a command
      const cb = this._callbacks.get(msg.id);
      if (cb) {
        this._callbacks.delete(msg.id);
        if (msg.error) {
          cb.reject(new Error(`CDP error: ${msg.error.message || JSON.stringify(msg.error)}`));
        } else {
          cb.resolve(msg.result || {});
        }
      }
    } else if (msg.method) {
      // Event
      const sessionId = msg.sessionId || '';
      const key = `${sessionId}::${msg.method}`;
      const handlers = this._eventHandlers.get(key);
      if (handlers) {
        for (const h of handlers) h(msg.params || {});
      }
      // Also dispatch without session for global listeners
      const globalKey = `::${msg.method}`;
      const globalHandlers = this._eventHandlers.get(globalKey);
      if (globalHandlers) {
        for (const h of globalHandlers) h(msg.params || {});
      }
    }
  }

  _onClose() {
    for (const [, cb] of this._callbacks) {
      cb.reject(new Error('CDP pipe closed'));
    }
    this._callbacks.clear();
  }

  send(method, params = {}, sessionId) {
    const id = this._nextId++;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject });
      this._pipe_in.write(JSON.stringify(msg) + '\0');
    });
  }

  on(method, handler, sessionId = '') {
    const key = `${sessionId}::${method}`;
    if (!this._eventHandlers.has(key)) {
      this._eventHandlers.set(key, []);
    }
    this._eventHandlers.get(key).push(handler);
  }

  off(method, handler, sessionId = '') {
    const key = `${sessionId}::${method}`;
    const arr = this._eventHandlers.get(key);
    if (arr) {
      const i = arr.indexOf(handler);
      if (i >= 0) arr.splice(i, 1);
    }
  }

  destroy() {
    try { this._pipe_in.end(); } catch (_) {}
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

class CDPPage extends EventEmitter {
  constructor(transport, sessionId, targetId, viewport) {
    super();
    this._transport = transport;
    this._sessionId = sessionId;
    this._targetId = targetId;
    this._viewport = viewport;
    this._closed = false;

    // Enable domains
    this._ready = this._init();
  }

  async _init() {
    const t = this._transport;
    const s = this._sessionId;
    await t.send('Page.enable', {}, s);
    await t.send('Runtime.enable', {}, s);

    // Console handler
    t.on('Runtime.consoleAPICalled', (params) => {
      const text = params.args.map(a => a.value !== undefined ? a.value : a.description || '').join(' ');
      this.emit('console', { text: () => text, type: () => params.type });
    }, s);

    // Apply viewport if set
    if (this._viewport) {
      await this._applyViewport(this._viewport.width, this._viewport.height);
    }
  }

  async _applyViewport(width, height) {
    await this._transport.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor: 1,
      mobile: false,
    }, this._sessionId);
  }

  async goto(url, options = {}) {
    await this._ready;
    const waitUntil = options.waitUntil || 'load';
    const timeout = options.timeout || 30000;

    // For networkidle, attach the Network listeners BEFORE navigating so no
    // request/response event fired during navigation is missed (registering
    // after Page.navigate could drop early events and stall the wait).
    // Resolve after 500ms of network silence, capped by the overall timeout.
    const idlePromise = waitUntil === 'networkidle'
      ? this._waitForNetworkIdle(500, timeout)
      : null;

    await this._transport.send('Page.navigate', { url }, this._sessionId);

    // Primary readiness signal: actively poll document.readyState until
    // 'complete' (with timeout). Unlike the one-shot Page.loadEventFired,
    // polling does not depend on catching an event that may have fired before
    // the listener was attached. readyState 'complete' fires after the load
    // event + all sub-resources, covering both 'load' and most 'networkidle'
    // needs — a robustness improvement over awaiting a single event.
    await this._waitForReadyState(timeout);
    if (idlePromise) await idlePromise;
  }

  _waitForReadyState(timeout = 30000) {
    const start = Date.now();
    const poll = async () => {
      while (Date.now() - start < timeout) {
        try {
          const res = await this._transport.send('Runtime.evaluate', {
            expression: 'document.readyState',
            returnByValue: true,
          }, this._sessionId);
          if (res.result && res.result.value === 'complete') return;
        } catch (_) {
          // Navigation/context swap in flight — retry until timeout.
        }
        await new Promise(r => setTimeout(r, 50));
      }
      // Timed out: resolve anyway so callers can still attempt a screenshot.
    };
    return poll();
  }

  _waitForNetworkIdle(idleMs = 500, maxWait = 5000) {
    // Resolve once there has been no network activity for `idleMs`.
    // Listeners are attached by the caller BEFORE Page.navigate.
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(hardTimer);
        this._transport.off('Network.requestWillBeSent', handler, this._sessionId);
        this._transport.off('Network.loadingFinished', handler, this._sessionId);
        this._transport.off('Network.loadingFailed', handler, this._sessionId);
        resolve();
      };
      let idleTimer = setTimeout(done, idleMs);
      const handler = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(done, idleMs);
      };
      this._transport.on('Network.requestWillBeSent', handler, this._sessionId);
      this._transport.on('Network.loadingFinished', handler, this._sessionId);
      this._transport.on('Network.loadingFailed', handler, this._sessionId);
      this._transport.send('Network.enable', {}, this._sessionId).catch(() => {});

      // Hard safety net.
      const hardTimer = setTimeout(done, maxWait);
    });
  }

  async evaluate(fn, ...args) {
    await this._ready;
    let expression;
    if (typeof fn === 'function') {
      if (args.length > 0) {
        const serializedArgs = args.map(a => JSON.stringify(a)).join(', ');
        expression = `(${fn.toString()})(${serializedArgs})`;
      } else {
        expression = `(${fn.toString()})()`;
      }
    } else {
      expression = fn;
    }

    const { result, exceptionDetails } = await this._transport.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, this._sessionId);

    if (exceptionDetails) {
      const errMsg = exceptionDetails.exception
        ? (exceptionDetails.exception.description || exceptionDetails.exception.value || 'Evaluation failed')
        : (exceptionDetails.text || 'Evaluation failed');
      throw new Error(errMsg);
    }
    return result ? result.value : undefined;
  }

  async setViewportSize({ width, height }) {
    await this._ready;
    this._viewport = { width, height };
    await this._applyViewport(width, height);
  }

  async screenshot(options = {}) {
    await this._ready;
    const params = { format: 'png' };
    if (!options.fullPage) {
      // Clip to viewport
      params.clip = {
        x: 0, y: 0,
        width: this._viewport ? this._viewport.width : 1280,
        height: this._viewport ? this._viewport.height : 720,
        scale: 1
      };
    }
    const { data } = await this._transport.send('Page.captureScreenshot', params, this._sessionId);
    const buffer = Buffer.from(data, 'base64');
    if (options.path) {
      const dir = path.dirname(options.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(options.path, buffer);
    }
    return buffer;
  }

  async close() {
    if (this._closed) return;
    this._closed = true;
    try {
      await this._transport.send('Target.closeTarget', { targetId: this._targetId });
    } catch (_) {}
  }
}

// ─── BrowserContext ────────────────────────────────────────────────────────

class CDPBrowserContext {
  constructor(transport, contextId, viewport) {
    this._transport = transport;
    this._contextId = contextId;
    this._viewport = viewport;
    this._pages = [];
  }

  async newPage() {
    const { targetId } = await this._transport.send('Target.createTarget', {
      url: 'about:blank',
      browserContextId: this._contextId,
    });
    const { sessionId } = await this._transport.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const page = new CDPPage(this._transport, sessionId, targetId, this._viewport);
    this._pages.push(page);
    return page;
  }

  async close() {
    for (const page of this._pages) {
      await page.close().catch(() => {});
    }
    try {
      await this._transport.send('Target.disposeBrowserContext', {
        browserContextId: this._contextId,
      });
    } catch (_) {}
  }
}

// ─── Browser ───────────────────────────────────────────────────────────────

class CDPBrowser {
  constructor(transport, proc) {
    this._transport = transport;
    this._proc = proc;
    this._pages = [];
  }

  async newPage() {
    const { targetId } = await this._transport.send('Target.createTarget', {
      url: 'about:blank',
    });
    const { sessionId } = await this._transport.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const page = new CDPPage(this._transport, sessionId, targetId, null);
    this._pages.push(page);
    return page;
  }

  async newContext(options = {}) {
    const { browserContextId } = await this._transport.send('Target.createBrowserContext', {});
    const viewport = options.viewport || null;
    return new CDPBrowserContext(this._transport, browserContextId, viewport);
  }

  async close() {
    for (const page of this._pages) {
      await page.close().catch(() => {});
    }
    this._transport.destroy();
    try {
      this._proc.kill();
    } catch (_) {}
    // Wait for process to exit
    await new Promise((resolve) => {
      if (this._proc.exitCode !== null) return resolve();
      this._proc.once('exit', resolve);
      setTimeout(resolve, 3000); // safety timeout
    });
  }
}

// ─── launch() ──────────────────────────────────────────────────────────────

async function launch(options = {}) {
  const executablePath = options.executablePath;
  if (!executablePath) {
    throw new Error('cdp-browser: executablePath is required');
  }

  const args = [
    '--remote-debugging-pipe',
    '--disable-background-networking',
    '--disable-client-side-phishing-detection',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ];

  // Headless mode
  if (options.headless !== false) {
    args.push('--headless=new');
  }

  // Temp user data dir for isolation. Use os.tmpdir() as the cross-platform
  // fallback — Windows has no TMPDIR, and a hardcoded '/tmp' there resolves to
  // an invalid path (e.g. D:\tmp\...), making the browser exit on launch and
  // surface as "CDP pipe closed".
  const tmpDir = (options.env && options.env.TMPDIR)
    || process.env.TMPDIR
    || os.tmpdir();
  const userDataDir = path.join(tmpDir, `cdp-profile-${process.pid}-${Date.now()}`);
  args.push(`--user-data-dir=${userDataDir}`);

  args.push('about:blank');

  const proc = spawn(executablePath, args, {
    stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...(options.env || {}) },
  });

  // Handle early crash
  const earlyExit = new Promise((_, reject) => {
    proc.once('exit', (code) => {
      reject(new Error(`Browser process exited with code ${code} before connection was established`));
    });
  });

  const transport = new CDPTransport(proc);

  // Wait for the first response to confirm connection works
  const connected = transport.send('Target.setDiscoverTargets', { discover: true });

  try {
    await Promise.race([connected, earlyExit]);
  } catch (err) {
    proc.kill();
    throw err;
  }

  // Clean up user data dir on close
  const origClose = CDPBrowser.prototype.close;
  const browser = new CDPBrowser(transport, proc);
  const _close = browser.close.bind(browser);
  browser.close = async function() {
    await _close();
    // Best-effort cleanup of temp profile
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  };

  return browser;
}

module.exports = { launch };
