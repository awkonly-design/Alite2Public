// Firmware build, device discovery and WiFi (ArduinoOTA) upload for Alite2 Studio.
//   compile()      runs scripts/build.sh --verbose and reports progress from the compiler output
//   findDevices()  browses mDNS for ArduinoOTA services (_arduino._tcp); Alite2 lights add TXT "alite2=<version>"
//   upload()       sends build/Alite2.ino.bin with espota.py from the esp32 Arduino core, parsing its "NN%" output
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mdnsFactory from 'multicast-dns';

const ESP32_CORE_VERSION = '3.0.2';

export function firmwarePaths(repoRoot) {
  const sketch = path.join(repoRoot, 'src', 'Alite2');
  const build = path.join(repoRoot, 'build');
  return { repoRoot, sketch, build, bin: path.join(build, 'Alite2.ino.bin'), buildScript: path.join(repoRoot, 'scripts', 'build.sh'), config: path.join(sketch, 'config.h') };
}

/** OTA port / host name from src/Alite2/config.h. There is no fixed OTA password: each light shows its own (see below). */
export async function otaConfig(p) {
  const text = await fs.readFile(p.config, 'utf8');
  const def = (k) => text.match(new RegExp(`^#define\\s+${k}\\s+"?([^"\\n]*?)"?\\s*(?://.*)?$`, 'm'))?.[1];
  return { port: +(def('OTA_PORT') || 3232), hostname: def('OTA_HOSTNAME') || 'Alite2' };
}

// Each light generates its own 8-character OTA password (from its IP address and MAC) and shows it in
// Setup > Radio under the IP address. It changes when the light's IP changes, and cannot be computed here:
// the user types it in per light. Recovery mode uses the last password the light showed.
export const OTA_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const OTA_PASSWORD_HELP = "Enter the 8-character OTA password shown on the light's LCD: Setup > Radio page, at the bottom under the IP address";
// Alite2Public needs light firmware 1.2.6 or later (OTA password on the LCD, Upgrade F/W back to the official firmware). Old factory firmware
// lights (HDS-15W) are below 1.2.6: they are still listed, but uploads to them are refused.
export const OLD_FACTORY_MSG = 'Old factory firmware (HDS-15W, below 1.2.6): Alite2Public needs light firmware 1.2.6 or later. Update the light to 1.2.6 or later first.';
/** Normalise a typed OTA password (trimmed, upper-case). Returns null unless it is 8 characters from OTA_PASSWORD_ALPHABET. */
export function normalizeOtaPassword(pw) {
  if (typeof pw !== 'string') return null;
  const v = pw.trim().toUpperCase();
  return v.length === 8 && [...v].every((c) => OTA_PASSWORD_ALPHABET.includes(c)) ? v : null;
}

// ------------------------------------------------------------------ compile
/**
 * Compile the firmware. onProgress({ progress 0..1, line? }) is called while compiling.
 * The progress follows the elapsed time, scaled by the duration of the previous build (build/.duration), so it
 * rises steadily even while the compiler prints nothing (linking) or prints many cached files at once.
 * It reaches ~90 % at the previous duration and then creeps towards 97 % until the build ends.
 */
export function compile(p, onProgress) {
  return new Promise((resolve) => {
    const durFile = path.join(p.build, '.duration');
    let expected = 90e3;
    try { expected = Math.min(15 * 60e3, Math.max(10e3, +fsSync.readFileSync(durFile, 'utf8') || expected)); } catch { /* first build */ }
    const t0 = Date.now();
    let steps = 0, shown = 0;
    const progressNow = () => {
      const t = (Date.now() - t0) / expected;
      const pr = t <= 1 ? 0.9 * t : 0.9 + 0.07 * (1 - Math.exp(-(t - 1) * 2));
      shown = Math.max(shown, Math.min(0.97, pr));
      return shown;
    };
    const ticker = setInterval(() => onProgress?.({ progress: progressNow() }), 250);
    const tail = [];
    const errors = [];
    const child = spawn('bash', [p.buildScript, '--verbose'], { cwd: p.repoRoot, env: { ...process.env, ARDUINO_LOCALE: 'en' } });
    const onLine = (line) => {
      if (!line.trim()) return;
      tail.push(line); if (tail.length > 400) tail.shift();
      if (/\berror\b/i.test(line) && !/-Werror|-fno-error|error_/.test(line)) errors.push(line.trim());
      if (/\s-o\s+"?[^"\s]+\.o"?/.test(line) || /^Using previously compiled file/.test(line)) steps++;
      onProgress?.({ progress: shown, line: line.length > 300 ? line.slice(0, 300) + '…' : line });
    };
    const split = (stream) => { let buf = ''; stream.on('data', (d) => { buf += d; const parts = buf.split(/\r?\n/); buf = parts.pop(); parts.forEach(onLine); }); stream.on('end', () => buf && onLine(buf)); };
    split(child.stdout); split(child.stderr);
    child.on('error', (e) => { clearInterval(ticker); resolve({ ok: false, error: e.message, errors, tail }); });
    child.on('close', async (code) => {
      clearInterval(ticker);
      if (code === 0) {
        try { await fs.writeFile(durFile, String(Date.now() - t0)); } catch { /* ignore */ }
        const size = tail.find((l) => /bytes|바이트/.test(l) && /%/.test(l)) || '';
        resolve({ ok: true, bin: p.bin, steps, summary: size.trim(), tail: tail.slice(-20) });
      } else {
        resolve({ ok: false, error: `Build failed (exit code ${code})`, errors: errors.slice(0, 30), tail: tail.slice(-60) });
      }
    });
  });
}

// ------------------------------------------------------------------ discovery
// Lights sold with the old factory firmware advertise ArduinoOTA as "HDS-15W" (all with the same name, no Alite2 TXT)
// (factory firmware below 1.2.6): they are listed but cannot be updated with Alite2Public. Lights running this firmware are "Alite2-XXXXXX"
// (last 3 MAC bytes, upper-case hex; compared case-insensitively) with TXT "alite2=<version>" ("recovery=1" in
// recovery mode). Lights with the new factory firmware are also "Alite2-XXXXXX", without the alite2 TXT.
// All "Alite2-XXXXXX" lights need the 8-character password shown on the light (needsPassword: true).
export const FACTORY_OTA = { hostname: 'HDS-15W' };

/** Browse mDNS for ArduinoOTA devices for `ms` milliseconds. Devices are told apart by their IP address. */
export function findDevices(ms = 3500, factoryName = '') {
  return new Promise((resolve) => {
    let mdns;
    try { mdns = mdnsFactory(); } catch (e) { resolve({ devices: [], error: 'mDNS unavailable: ' + e.message }); return; }
    const SERVICE = '_arduino._tcp.local';
    const byIp = new Map();   // 'ip:port' -> { name, host, port, txt }
    mdns.on('response', (res, rinfo) => {
      const recs = [...(res.answers || []), ...(res.additionals || [])];
      if (!recs.some((r) => r.name === SERVICE || r.name.endsWith('.' + SERVICE))) return;
      const a = recs.find((r) => r.type === 'A');
      const ip = a?.data || rinfo?.address;
      if (!ip || ip.includes(':')) return;
      const srv = recs.find((r) => r.type === 'SRV');
      const key = `${ip}:${srv?.data?.port || 3232}`;
      const it = byIp.get(key) || { ip };
      for (const r of recs) {
        if (r.type === 'PTR' && r.name === SERVICE) it.name = String(r.data).replace('.' + SERVICE, '');
        else if (r.type === 'SRV') { it.port = r.data.port; it.host = String(r.data.target).replace(/\.local$/, ''); it.name ||= r.name.replace('.' + SERVICE, ''); }
        else if (r.type === 'TXT') {
          it.txt = {};
          for (const b of [].concat(r.data || [])) { const t = Buffer.isBuffer(b) ? b.toString() : String(b); const k = t.indexOf('='); if (k > 0) it.txt[t.slice(0, k)] = t.slice(k + 1); }
        }
      }
      byIp.set(key, it);
    });
    mdns.on('error', () => { /* ignore */ });
    const ask = () => { try { mdns.query({ questions: [{ name: SERVICE, type: 'PTR' }] }); } catch { /* ignore */ } };
    ask(); const t1 = setTimeout(ask, 1000); const t2 = setTimeout(ask, 2200);
    setTimeout(() => {
      clearTimeout(t1); clearTimeout(t2);
      try { mdns.destroy(); } catch { /* ignore */ }
      const fname = String(factoryName || '').toLowerCase();
      const isFactory = (n) => !!fname && !!n && (n.toLowerCase() === fname || n.toLowerCase().startsWith(fname + '-'));
      const isAlite2Name = (n) => !!n && /^alite2-[0-9a-f]{6}$/i.test(n);
      const devices = [...byIp.values()].filter((d) => d.name || d.host).map((d) => {
        const name = d.name || d.host;
        const recovery = d.txt?.recovery === '1';
        const factory = !d.txt?.alite2 && (isFactory(name) || isFactory(d.host));
        // new factory firmware: Alite2-XXXXXX name without the alite2 TXT
        const newFactory = !factory && !d.txt?.alite2 && !recovery && (isAlite2Name(name) || isAlite2Name(d.host));
        const alite2 = !!d.txt?.alite2 || factory || newFactory || (recovery && (isAlite2Name(name) || isAlite2Name(d.host)));
        return {
          name: factory ? `${name} (${d.ip})` : name, host: d.host || name, ip: d.ip, port: d.port || 3232,
          alite2: alite2 && !factory, factory, newFactory, recovery, needsPassword: !factory, supported: !factory,
          version: recovery ? null : factory || newFactory ? 'factory' : (d.txt?.alite2 || null), board: d.txt?.board || null,
        };
      }).sort((a, b) => (b.alite2 - a.alite2) || a.name.localeCompare(b.name));
      resolve({ devices });
    }, ms);
  });
}

/** Old factory firmware (HDS-15W) mDNS name: FACTORY_OTA, overridable by an environment variable or ui_studio/factory.local.json. */
export async function factoryOta(studioRoot) {
  let file = {};
  try { file = JSON.parse(await fs.readFile(path.join(studioRoot, 'factory.local.json'), 'utf8')); } catch { /* none */ }
  return {
    hostname: process.env.ALITE2_FACTORY_OTA_HOSTNAME || file.hostname || FACTORY_OTA.hostname,
  };
}

// ------------------------------------------------------------------ upload
function dataDirs() {
  const home = os.homedir();
  return [path.join(home, 'Library', 'Arduino15'), path.join(home, '.arduino15'), process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Arduino15')].filter(Boolean);
}
export async function findEspota() {
  const dirs = [...dataDirs()];
  try {
    const d = await new Promise((res) => execFile('arduino-cli', ['config', 'get', 'directories.data'], (e, out) => res(e ? '' : String(out).trim())));
    if (d) dirs.unshift(d);
  } catch { /* ignore */ }
  for (const d of dirs) {
    const f = path.join(d, 'packages', 'esp32', 'hardware', 'esp32', ESP32_CORE_VERSION, 'tools', 'espota.py');
    try { await fs.access(f); return f; } catch { /* next */ }
  }
  return null;
}

// espota sends the invitation up to 10 times and waits INVITE_TIMEOUT s for each answer (a light on a weak WiFi
// link may lose some packets, so a few retries help; 10 × 4 s = 40 s at most before "no answer").
const INVITE_TIMEOUT = 4;
const NO_ANSWER = (ip) => `No answer from the light at ${ip}. Check that it is in WiFi mode (Setup → Radio → Artnet/sACN), shows this IP address, and has a good WiFi signal (move it closer to the access point).`;

/**
 * Upload the firmware to one device. onProgress(0..1, stage) — stage: 'invite' | 'auth' | 'connect' | 'upload' | 'finish'.
 * `signal` (AbortSignal) cancels the upload. Resolves { ok, error?, cancelled? }.
 */
export function upload({ espota, bin, ip, port, password, signal }, onProgress) {
  return new Promise((resolve) => {
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const args = [espota, '-i', ip, '-p', String(port || 3232), '-f', bin, '-r', '-d', '-t', String(INVITE_TIMEOUT)];   // -d: shows the light's answer (e.g. a rejected image)
    if (password) args.push('-a', password);
    const child = spawn(py, args, { env: process.env });
    let out = '', lastPct = -1, stage = 'invite', cancelled = false;
    const onAbort = () => { cancelled = true; child.kill(); };
    if (signal) { if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true }); }
    onProgress?.(0, stage);
    const setStage = (st) => { if (st !== stage) { stage = st; onProgress?.(Math.max(0, lastPct) / 100, stage); } };
    const onData = (d) => {
      const s = String(d); out += s; if (out.length > 20000) out = out.slice(-20000);
      if (/Authenticating/.test(s)) setStage('auth');
      if (/Waiting for device/.test(s)) setStage('connect');
      if (/Waiting for result/.test(s)) setStage('finish');
      const m = [...s.matchAll(/(\d{1,3})%/g)].pop();
      if (m) { const pct = Math.min(100, +m[1]); if (stage !== 'finish') stage = 'upload'; if (pct !== lastPct) { lastPct = pct; onProgress?.(pct / 100, stage); } }
    };
    child.stdout.on('data', onData); child.stderr.on('data', onData);
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (cancelled) { resolve({ ok: false, cancelled: true, error: 'Cancelled' }); return; }
      if (code === 0) { onProgress?.(1, 'done'); resolve({ ok: true }); return; }
      if (/Result:.*Abort/i.test(out)) { resolve({ ok: false, error: 'Rejected by the light: this firmware does not contain the Alite2Link library' }); return; }
      if (/No response from the ESP/i.test(out)) { resolve({ ok: false, error: NO_ANSWER(ip) }); return; }
      if (/No Answer to our Authentication/i.test(out)) { resolve({ ok: false, error: `The light at ${ip} stopped answering during authentication (weak WiFi signal?). Try again.` }); return; }
      if (/No response from device/i.test(out)) { resolve({ ok: false, error: `The light at ${ip} accepted the password but did not connect back to this computer. Check that no firewall blocks incoming connections to Python, then try again.` }); return; }
      const lines = out.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l && !/^Uploading:/.test(l));
      const err = lines.reverse().find((l) => /error|fail|denied|auth|timeout|no response/i.test(l)) || lines[0] || `espota exit code ${code}`;
      resolve({ ok: false, error: err.replace(/^\d{2}:\d{2}:\d{2}\s*\[\w+\]:\s*/, '') });
    });
  });
}
