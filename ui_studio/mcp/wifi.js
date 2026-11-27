// WiFi details of this computer for the "WiFi Setup" wizard of Alite2 Studio.
//   wifiInfo()           the network this computer is connected to (if the OS tells) and the saved networks
//   wifiPassword(ssid)   the saved password of a network (the OS asks the user for permission first, e.g. the macOS keychain)
// Commands run with execFile (no shell); the password is never logged.
import { execFile } from 'node:child_process';

const run = (cmd, args, timeout = 8000) => new Promise((resolve) => {
  execFile(cmd, args, { timeout, maxBuffer: 1 << 20, windowsHide: true }, (err, stdout, stderr) =>
    resolve({ ok: !err, out: String(stdout || ''), err: String(stderr || err?.message || ''), code: err?.code }));
});

const clean = (s) => String(s || '').trim();
const usable = (s) => !!s && !/^<redacted>$/i.test(s);
const uniq = (list) => [...new Set(list.filter(usable))];

async function macWifiDevice() {
  const r = await run('networksetup', ['-listallhardwareports']);
  const m = r.out.match(/Hardware Port: (?:Wi-Fi|AirPort)\s*\nDevice: (\S+)/);
  return m ? m[1] : 'en0';
}

async function macInfo() {
  const dev = await macWifiDevice();
  let current = '';
  // macOS 14.4+ hides the SSID from command line tools without location permission ("<redacted>" or "not associated")
  const a = await run('networksetup', ['-getairportnetwork', dev]);
  const m = a.out.match(/Current Wi-Fi Network: (.+)/);
  if (m) current = clean(m[1]);
  if (!usable(current)) {
    const s = await run('ipconfig', ['getsummary', dev]);
    const m2 = s.out.match(/^\s*SSID : (.+)$/m);
    current = m2 ? clean(m2[1]) : '';
  }
  const p = await run('networksetup', ['-listpreferredwirelessnetworks', dev]);
  const saved = p.out.split('\n').slice(1).map(clean);
  return { current: usable(current) ? current : '', saved: uniq(saved) };
}

async function winInfo() {
  const i = await run('netsh', ['wlan', 'show', 'interfaces']);
  // "SSID : name" (not "BSSID"); the label is the same in every Windows language
  const m = i.out.match(/^\s*SSID\s*:\s*(.+)$/m);
  const p = await run('netsh', ['wlan', 'show', 'profiles']);
  // profile lines look like "    All User Profile     : name" (label translated); headers end with ':' without a value
  const saved = [...p.out.matchAll(/^\s+[^:\r\n]+\s:\s(.+)$/gm)].map((x) => clean(x[1]));
  return { current: m ? clean(m[1]) : '', saved: uniq(saved) };
}

async function linuxInfo() {
  const a = await run('nmcli', ['-t', '-f', 'ACTIVE,SSID', 'device', 'wifi']);
  const cur = a.out.split('\n').find((l) => /^(yes|예|是|oui|ja|sí):/i.test(l));
  const c = await run('nmcli', ['-t', '-f', 'NAME,TYPE', 'connection', 'show']);
  const saved = c.out.split('\n').filter((l) => /:802-11-wireless$/.test(l)).map((l) => l.replace(/:802-11-wireless$/, '').replace(/\\:/g, ':'));
  return { current: cur ? clean(cur.slice(cur.indexOf(':') + 1)).replace(/\\:/g, ':') : '', saved: uniq(saved) };
}

/** { platform, current, saved[] }: current is '' when the OS does not tell (e.g. macOS without location permission). */
export async function wifiInfo() {
  const platform = process.platform;
  let r = { current: '', saved: [] };
  try {
    if (platform === 'darwin') r = await macInfo();
    else if (platform === 'win32') r = await winInfo();
    else if (platform === 'linux') r = await linuxInfo();
  } catch { /* nothing found */ }
  const saved = r.current ? [r.current, ...r.saved.filter((s) => s !== r.current)] : r.saved;
  return { platform, current: r.current, saved };
}

/** Saved password of a network. macOS shows a keychain window where the user allows it (admin name and password). */
export async function wifiPassword(ssid) {
  ssid = String(ssid || '');
  if (!ssid || ssid.length > 64 || /[\0\r\n"]/.test(ssid)) throw new Error('Invalid network name');
  const platform = process.platform;
  if (platform === 'darwin') {
    const r = await run('security', ['find-generic-password', '-D', 'AirPort network password', '-a', ssid, '-w'], 120000);
    if (r.ok) return { password: r.out.replace(/\r?\n$/, '') };
    if (/could not be found/i.test(r.err)) throw new Error(`No saved password for "${ssid}" in the keychain`);
    throw new Error('The keychain did not give the password (cancelled or not allowed)');
  }
  if (platform === 'win32') {
    const r = await run('netsh', ['wlan', 'show', 'profile', `name=${ssid}`, 'key=clear']);
    // "Key Content : xxx" (English), "키 콘텐츠 : xxx" (Korean), "キー コンテンツ : xxx" (Japanese)
    const m = r.out.match(/^\s*(?:Key Content|키 콘텐츠|キー コンテンツ|Contenu de la clé|Schlüsselinhalt)\s*:\s?(.*)$/mi);
    if (m) return { password: m[1].replace(/\r$/, '') };
    throw new Error(r.ok ? `No saved password for "${ssid}" (run Alite2 Studio as administrator or type it)` : `Network "${ssid}" is not saved on this computer`);
  }
  if (platform === 'linux') {
    const r = await run('nmcli', ['-s', '-g', '802-11-wireless-security.psk', 'connection', 'show', ssid], 60000);
    if (r.ok) return { password: r.out.replace(/\r?\n$/, '') };
    throw new Error(`No saved password for "${ssid}" (NetworkManager did not give it)`);
  }
  throw new Error('Reading saved WiFi passwords is not supported on this system');
}
