#!/usr/bin/env node
/**
 * Headless-Chrome screenshot of the web build over CDP. No npm deps (Node ≥ 22: fetch + WebSocket).
 *
 *   node scripts/web-shot.mjs <url> <out.png> [waitMs=25000] [width=1440] [height=900]
 *
 * env  CHROME_BIN  path to a Chrome/Chromium binary (default: macOS Google Chrome)
 *      SCALE       deviceScaleFactor (default 1)
 *      PRE_JS      JS expression (may be async) evaluated after the wait, before the shot —
 *                  e.g. click a lesson and Play.
 *
 * Why this exists: embedded/background browser panes report document.hidden, which pauses
 * requestAnimationFrame and ResizeObserver, so an R3F canvas never mounts or renders there.
 * Headless Chrome has a visible document and a real GPU (ANGLE/Metal on Apple silicon).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const [, , url, out, waitMs = '25000', width = '1440', height = '900'] = process.argv;
if (!url || !out) {
  console.error('usage: node scripts/web-shot.mjs <url> <out.png> [waitMs] [width] [height]');
  process.exit(2);
}
const chromeBin =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const scale = Number(process.env.SCALE ?? '1');
const port = 9333 + Math.floor(Math.random() * 500);
const profile = `${process.env.TMPDIR ?? '/tmp'}/web-shot-profile-${port}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chrome = spawn(
  chromeBin,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--ignore-gpu-blocklist',
    'about:blank',
  ],
  { stdio: 'ignore' }
);
const shutdown = () => {
  chrome.kill();
  fs.rmSync(profile, { recursive: true, force: true });
};
process.on('exit', shutdown);

let targets = [];
for (let i = 0; i < 40 && !targets.some((t) => t.type === 'page'); i += 1) {
  await sleep(250);
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  } catch {
    // DevTools endpoint not up yet.
  }
}
const page = targets.find((t) => t.type === 'page');
if (!page) {
  console.error(`Chrome did not expose a page target (binary: ${chromeBin})`);
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => {
  ws.onopen = resolve;
});
let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return reply.result?.result?.value ?? reply.result?.exceptionDetails?.text ?? reply.result;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: scale,
  mobile: false,
});
await send('Page.navigate', { url });
await sleep(Number(waitMs));
if (process.env.PRE_JS) {
  console.log('PRE_JS ->', JSON.stringify(await evaluate(process.env.PRE_JS)));
}
console.log(
  'page ->',
  JSON.stringify(
    await evaluate(`({
      visibility: document.visibilityState,
      r3fStore: !!window.__r3f,
      webgl: (() => { try { const c = document.createElement('canvas'); const g = c.getContext('webgl2');
        const d = g && g.getExtension('WEBGL_debug_renderer_info');
        return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : (g ? 'webgl2' : 'none'); } catch { return 'err'; } })(),
      canvas: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(),
    })`)
  )
);
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('saved', out);
ws.close();
process.exit(0);
