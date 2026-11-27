// "WiFi Setup" wizard: gives a light the WiFi network it joins in WiFi mode, over Bluetooth (Web Bluetooth).
//   1. put the light in Bluetooth mode   2. network from this computer (mcp/wifi.js) or typed   3. send it to the light
// The light stores up to 3 networks; sending replaces the ones it had, then it restarts in WiFi (Artnet) mode.
// Passwords stay in this tab's memory only (never saved, never logged).
import { h } from './icons.js';
import { MIN_LIGHT_FW } from './build.js';

const BLE_NAME = 'A SUN';                                          // ALITE2_BLE_NAME (advertised "A SUN-<MAC>")
const SERVICE = '4bc61148-e02d-4b06-826e-637981ebb0a8';           // ALITE2_BLE_SERVICE_UUID
const WRITE = 'a3dbd4b1-fccd-4e3d-80dc-ad8bd27f3b6a';             // ALITE2_BLE_WRITE_UUID
const NOTIFY = 'c23f1999-4e3d-4de9-bade-7b3451bdda3e';            // ALITE2_BLE_NOTIFY_UUID
const MAX_NETS = 3;
const MAX_LEN = 32;                                                // bytes per name / password stored on the light
const utf8 = new TextEncoder();
const bytes = (s) => utf8.encode(s).length;
const STEPS = ['Bluetooth mode', 'WiFi network', 'Send to light'];

const WIFI_REPLY_VERSION = 0x4010;
const utf8in = new TextDecoder();
/** GETWIFI reply: u16 version (LE), then 3 × { ssid[32], pass[32] } (zero padded), then other settings.
 *  A short connection (small ATT MTU) can cut it: fields are read as far as they arrived. */
function parseGetWifi(b) {
  if (b.length < 2 + MAX_LEN || (b[0] | (b[1] << 8)) !== WIFI_REPLY_VERSION) return null;
  const str = (off) => { const f = b.subarray(off, Math.min(off + MAX_LEN, b.length)); const z = f.indexOf(0); return utf8in.decode(z < 0 ? f : f.subarray(0, z)); };
  const nets = [];
  for (let i = 0; i < MAX_NETS; i++) {
    const o = 2 + i * 2 * MAX_LEN;
    if (o >= b.length) break;
    nets.push({ ssid: str(o), pass: o + MAX_LEN < b.length ? str(o + MAX_LEN) : '', cut: b.length < o + 2 * MAX_LEN });
  }
  return { nets };
}

/** Problem with one network entry, or '' when it can be sent. */
function checkNet(n, i) {
  const what = i ? `Network ${i + 1}` : 'Network';
  if (!n.ssid) return i ? '' : 'Enter the network name (SSID).';
  if (n.ssid.includes(',') || n.pass.includes(',')) return `${what}: commas (,) cannot be sent to the light.`;
  if (bytes(n.ssid) > MAX_LEN) return `${what}: the name is longer than ${MAX_LEN} bytes.`;
  if (bytes(n.pass) > MAX_LEN) return `${what}: the light stores passwords of up to ${MAX_LEN} characters.`;
  if (n.pass && n.pass.length < 8) return `${what}: WPA passwords have at least 8 characters (leave it empty for an open network).`;
  return '';
}

export class WifiDialog {
  constructor(app) {
    this.app = app;
    this.layer = h('div', { class: 'build-layer wifi-layer' });
    document.body.append(this.layer);
    this.layer.addEventListener('mousedown', (e) => { if (e.target === this.layer && !this.busy) this.close(); });
    this.layer.addEventListener('keydown', (e) => {
      e.stopPropagation();   // typing here must not reach the editor shortcuts
      if (e.key === 'Escape' && !this.busy) this.close();
    });
    this.reset();
  }

  reset() {
    this.step = 0;
    this.nets = [{ ssid: '', pass: '' }];
    this.showPass = false;
    this.pc = null;          // { platform, current, saved[] } from the server
    this.busy = '';          // text of the running action
    this.msg = null;         // { level, text }
    this.done = false;
    this.device = null;      // light chosen in the Bluetooth chooser (reused for reading and saving)
    this.lightNets = null;   // networks read from the light
    this.unconfirmed = false; // the light restarted before answering the write
  }

  get isOpen() { return this.layer.classList.contains('open'); }
  open() {
    if (!this.isOpen && (this.done || this.step === 2)) this.reset();
    this.layer.classList.add('open');
    this.render();
  }
  close() { try { this.device?.gatt.disconnect(); } catch { /* ignore */ } this.device = null; this.layer.classList.remove('open'); this.nets.forEach((n) => { n.pass = ''; }); this.done = false; this.step = 0; }

  setMsg(level, text) { this.msg = text ? { level, text } : null; this.render(); }

  // ---------------------------------------------------------------- step 2: this computer's WiFi
  async readPc() {
    if (!this.app.bridge.connected) { this.setMsg('error', 'Not connected to the Alite2 Studio server (ui_studio/run.sh)'); return; }
    this.busy = 'Reading the WiFi networks of this computer…'; this.msg = null; this.render();
    try {
      this.pc = await this.app.bridge.request('wifi_info', {});
      const first = this.pc.current || this.pc.saved[0] || '';
      if (!this.nets[0].ssid && first) this.nets[0].ssid = first;
      this.busy = '';
      if (!this.pc.saved.length && !this.pc.current) this.setMsg('warn', 'No WiFi network found on this computer — type the name and password.');
      else this.setMsg('ok', this.pc.current
        ? `This computer is connected to "${this.pc.current}". Press "Get password" to read its saved password.`
        : 'Your system does not tell which network is connected (macOS hides it). Pick it under "Networks saved on this computer", then press "Get password".');
    } catch (e) { this.busy = ''; this.setMsg('error', 'Could not read the WiFi networks: ' + e.message); }
  }

  async readPassword(i) {
    const n = this.nets[i];
    if (!n.ssid) { this.setMsg('warn', 'Choose or type the network name first.'); return; }
    this.busy = this.pc?.platform === 'darwin'
      ? `Waiting for the keychain… allow access to "${n.ssid}" in the macOS window (it asks for an administrator name and password).`
      : `Reading the saved password of "${n.ssid}"…`;
    this.msg = null; this.render();
    try {
      const r = await this.app.bridge.request('wifi_password', { ssid: n.ssid });
      n.pass = r.password || '';
      this.busy = '';
      this.setMsg('ok', n.pass ? `Password of "${n.ssid}" read from this computer.` : `"${n.ssid}" is saved without a password (open network).`);
    } catch (e) { this.busy = ''; this.setMsg('error', e.message + ' — you can type the password instead.'); }
  }

  // ---------------------------------------------------------------- step 3: send over Bluetooth
  packet() {
    const f = [];
    for (let i = 0; i < MAX_NETS; i++) { const n = this.nets[i] || { ssid: '', pass: '' }; f.push(n.ssid, n.ssid ? n.pass : ''); }
    return utf8.encode('SETWIFI:' + f.join(','));
  }

  /** Bluetooth connection to a light: the light chosen before (no chooser), or the browser's device chooser. */
  async connect() {
    if (!navigator.bluetooth) throw Object.assign(new Error('This browser has no Web Bluetooth. Open Alite2 Studio in Chrome or Edge.'), { level: 'error' });
    if (!this.device) {
      try {
        // the device chooser must open directly from the button press
        this.device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: BLE_NAME }, { services: [SERVICE] }], optionalServices: [SERVICE] });
      } catch (e) {
        if (e.name === 'NotFoundError') throw Object.assign(new Error('No light chosen. Check that it is in Bluetooth mode and no phone app is connected to it, then try again.'), { level: 'warn' });
        throw Object.assign(new Error('Bluetooth: ' + e.message + (/permission|denied|not allowed/i.test(e.message) ? ' (allow Bluetooth for the browser in the system settings)' : '')), { level: 'error' });
      }
    }
    const device = this.device;
    this.busy = `Connecting to ${device.name || 'the light'}…`; this.msg = null; this.render();
    let server = device.gatt.connected ? device.gatt : null;
    for (let attempt = 0; attempt < 3 && !server; attempt++) {
      try { server = await device.gatt.connect(); } catch (e) { if (attempt === 2) throw e; await new Promise((r) => setTimeout(r, 600)); }
    }
    return (await server).getPrimaryService(SERVICE);
  }

  fail(prefix, e) {
    this.busy = '';
    if (e.level) { this.setMsg(e.level, e.message); return; }
    try { this.device?.gatt.disconnect(); } catch { /* ignore */ }
    this.setMsg('error', `${prefix}: ${e.message}. Move closer to the light (Bluetooth mode) and try again.`);
  }

  /** Step 2 "Read from light": the networks the light has now (GETWIFI reply on the notify characteristic). */
  async readLight() {
    try {
      const svc = await this.connect();
      this.busy = 'Reading the WiFi settings of the light…'; this.render();
      const notify = await svc.getCharacteristic(NOTIFY);
      const write = await svc.getCharacteristic(WRITE);
      const reply = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { cleanup(); reject(new Error('the light did not answer')); }, 5000);
        const onValue = (e) => { cleanup(); resolve(new Uint8Array(e.target.value.buffer.slice(0))); };
        const cleanup = () => { clearTimeout(timer); notify.removeEventListener('characteristicvaluechanged', onValue); };
        notify.addEventListener('characteristicvaluechanged', onValue);
        notify.startNotifications().then(() => write.writeValueWithResponse(utf8.encode('GETWIFI:'))).catch((e) => { cleanup(); reject(e); });
      });
      try { await notify.stopNotifications(); } catch { /* ignore */ }
      const r = parseGetWifi(reply);
      this.busy = '';
      if (!r) { this.setMsg('error', `Unexpected answer from the light (${reply.length} bytes).`); return; }
      const nets = r.nets.filter((n) => n.ssid);
      this.lightNets = nets;
      if (!nets.length) { this.setMsg('warn', `${this.device.name || 'The light'} has no WiFi network yet.`); return; }
      this.nets = nets.map((n) => ({ ssid: n.ssid, pass: n.pass }));
      const cut = r.nets.some((n) => n.cut && n.ssid);
      this.setMsg(cut ? 'warn' : 'ok', `Read ${nets.length} network(s) from ${this.device.name || 'the light'}.` +
        (cut ? ' The answer was cut short by the Bluetooth connection: check the last password.' : ' Change them or add one, then press Next.'));
    } catch (e) { this.fail('Reading failed', e); }
  }

  async send() {
    let device = null, written = false;
    try {
      const svc = await this.connect();
      device = this.device;
      const ch = await svc.getCharacteristic(WRITE);
      this.busy = 'Sending the WiFi settings…'; this.render();
      written = true;
      await ch.writeValueWithResponse(this.packet());
      this.finishSend(device, true);
    } catch (e) {
      if (!written || e.level) { this.fail('Sending failed', e); return; }
      // The light saves the networks and restarts into WiFi mode right after it gets them, so the answer to the
      // write often never arrives ("GATT operation failed"). The light dropping the connection means it restarted.
      this.busy = 'Checking whether the light restarts…'; this.render();
      const restarted = await new Promise((resolve) => {
        if (!device.gatt.connected) { resolve(true); return; }
        const t = setTimeout(() => { device.removeEventListener('gattserverdisconnected', on); resolve(false); }, 6000);
        const on = () => { clearTimeout(t); resolve(true); };
        device.addEventListener('gattserverdisconnected', on, { once: true });
      });
      if (restarted) { this.finishSend(device, false); return; }
      this.busy = '';
      this.setMsg('warn', `The light did not confirm (${e.message}). If its screen shows "Complete to setup / Change to WiFi mode" and it restarts, the settings were saved; otherwise move closer and press Save to light again.`);
    }
  }

  /** confirmed: the light answered the write; otherwise it dropped the connection (restarted) right after it. */
  finishSend(device, confirmed) {
    this.busy = '';
    this.done = true;
    this.unconfirmed = !confirmed;
    this.lightName = device.name || 'The light';
    this.nets.forEach((n) => { n.pass = ''; });
    this.device = null;    // the light restarts in WiFi mode
    this.msg = null;
    this.render();
    setTimeout(() => { try { device.gatt.disconnect(); } catch { /* restarted */ } }, 1500);
  }

  // ---------------------------------------------------------------- navigation
  next() {
    if (this.step === 1) {
      const err = this.nets.map(checkNet).find(Boolean);
      if (err) { this.setMsg('error', err); return; }
    }
    this.step++; this.msg = null; this.render();
  }
  back() { if (this.step > 0) { this.step--; this.msg = null; this.render(); } }

  // ---------------------------------------------------------------- rendering
  render() {
    if (!this.isOpen) return;
    const act = document.activeElement;
    const focus = this.layer.contains(act) && act.dataset.f ? { f: act.dataset.f, pos: act.selectionStart } : null;
    this.layer.textContent = '';
    const busy = !!this.busy;

    const steps = h('div', { class: 'wz-steps' }, STEPS.map((t, i) =>
      h('div', { class: 'wz-step' + (i === this.step ? ' on' : '') + (i < this.step || this.done ? ' done' : '') },
        h('span', { class: 'wz-num' }, i < this.step || this.done ? '✓' : String(i + 1)), t)));

    const body = this.done ? this.renderDone() : [this.renderStep0, this.renderStep1, this.renderStep2][this.step].call(this);
    const status = busy ? h('div', { class: 'build-summary wz-busy' }, h('span', { class: 'wz-spin' }), this.busy)
      : this.msg ? h('div', { class: 'build-summary ' + this.msg.level }, this.msg.text) : null;

    const foot = this.done
      ? h('div', { class: 'modal-foot' }, h('span', { style: { flex: '1' } }),
        h('button', { class: 'btn', onclick: () => { this.reset(); this.render(); } }, 'Set up another light'),
        h('button', { class: 'btn primary', onclick: () => this.close() }, 'Close'))
      : h('div', { class: 'modal-foot' },
        h('span', { style: { flex: '1' } }),
        h('button', { class: 'btn', disabled: busy, onclick: () => this.close() }, 'Cancel'),
        this.step > 0 ? h('button', { class: 'btn', disabled: busy, onclick: () => this.back() }, '‹ Back') : null,
        this.step < 2
          ? h('button', { class: 'btn primary', disabled: busy, onclick: () => this.next() }, 'Next ›')
          : h('button', { class: 'btn primary', disabled: busy, onclick: () => this.send() }, 'Save to light'));

    this.layer.append(h('div', { class: 'modal build-modal wifi-modal' },
      h('div', { class: 'modal-head' }, 'WiFi Setup'),
      h('div', { class: 'modal-body build-body' }, steps, body, status),
      foot));
    if (focus) {
      const el = this.layer.querySelector(`[data-f="${focus.f}"]`);
      if (el) { el.focus(); if (focus.pos != null && el.setSelectionRange) try { el.setSelectionRange(focus.pos, focus.pos); } catch { /* not a text field */ } }
    }
  }

  renderStep0() {
    const noBt = !navigator.bluetooth;
    return h('div', { class: 'wz-page' },
      h('p', {}, 'The light receives its WiFi settings over Bluetooth. Put it in Bluetooth mode first:'),
      h('ol', { class: 'wz-list' },
        h('li', {}, 'On the light, open ', h('b', {}, 'Setup'), ' from the menu and press ', h('b', {}, 'F1'), ' until the ', h('b', {}, 'Radio'), ' page is shown.'),
        h('li', {}, 'Turn the dial to choose ', h('b', {}, 'Bluetooth'), '.'),
        h('li', {}, 'Press and hold ', h('b', {}, 'F2'), '. The light restarts in Bluetooth mode.'),
        h('li', {}, 'Keep the light near this computer. Close the phone app (Lampora) if it is connected: the light accepts one Bluetooth connection at a time.')),
      h('div', { class: 'info-note' }, 'Already in Bluetooth mode? Just press Next. This also works on lights in recovery mode (backlight blinking).'),
      noBt ? h('div', { class: 'build-summary warn' }, 'This browser cannot use Bluetooth (Web Bluetooth). Open Alite2 Studio (http://127.0.0.1:5190) in Chrome or Edge to send the settings.') : null);
  }

  renderStep1() {
    const busy = !!this.busy;
    const saved = this.pc ? this.pc.saved : [];
    const rows = this.nets.map((n, i) => {
      const ssid = h('input', { class: 'fld', placeholder: 'Network name (SSID)', spellcheck: false, autocomplete: 'off', 'data-f': `s${i}`, disabled: busy });
      ssid.value = n.ssid;
      ssid.addEventListener('input', () => { n.ssid = ssid.value; });
      const pass = h('input', { class: 'fld', type: this.showPass ? 'text' : 'password', placeholder: 'Password (empty for an open network)', spellcheck: false, autocomplete: 'off', 'data-f': `p${i}`, disabled: busy });
      pass.value = n.pass;
      pass.addEventListener('input', () => { n.pass = pass.value; });
      for (const el of [ssid, pass]) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.next(); } });
      return h('div', { class: 'wz-net' },
        h('div', { class: 'wz-net-head' },
          h('b', {}, i === 0 ? 'Network' : `Network ${i + 1} (optional)`),
          h('span', { style: { flex: '1' } }),
          this.pc ? h('button', { class: 'btn small', disabled: busy || !n.ssid, title: 'Read the password this computer saved for this network', onclick: () => this.readPassword(i) }, 'Get password') : null,
          i > 0 ? h('button', { class: 'btn small', disabled: busy, onclick: () => { this.nets.splice(i, 1); this.render(); } }, 'Remove') : null),
        saved.length ? this.savedSelect(n, saved, busy) : null,
        h('div', { class: 'wz-fields' }, ssid, pass));
    });
    const show = h('input', { type: 'checkbox', checked: this.showPass, disabled: busy });
    show.addEventListener('change', () => { this.showPass = show.checked; this.render(); });
    return h('div', { class: 'wz-page' },
      h('div', { class: 'wz-row' },
        h('button', { class: 'btn', disabled: busy, onclick: () => this.readPc() }, this.pc ? '↻ Read again' : 'Read from this computer'),
        h('button', { class: 'btn', disabled: busy, title: 'Read the networks the light has now (over Bluetooth, the light must be in Bluetooth mode)', onclick: () => this.readLight() }, this.lightNets ? '↻ Read from light' : 'Read from light'),
        h('span', { class: 'info-note wz-inline' }, 'or type the network name and password.')),
      this.device ? h('div', { class: 'info-note wz-inline' }, `Light: ${this.device.name || 'connected light'} — Save sends to this light.`) : null,
      ...rows,
      h('div', { class: 'wz-row' },
        h('label', { class: 'wz-check' }, show, ' Show passwords'),
        h('span', { style: { flex: '1' } }),
        this.nets.length < MAX_NETS ? h('button', { class: 'btn small', disabled: busy, onclick: () => { this.nets.push({ ssid: '', pass: '' }); this.render(); } }, '+ Add another network') : null),
      h('div', { class: 'info-note' }, 'The light supports 2.4 GHz WiFi only (not 5 GHz networks). It keeps up to 3 networks and joins the first one it finds; sending replaces the networks it had.'));
  }

  /** Picker of the networks saved on this computer (the one it is connected to first, when known). */
  savedSelect(n, saved, busy) {
    const cur = this.pc?.current;
    const sel = h('select', { class: 'fld wz-saved', disabled: busy, title: 'Networks saved on this computer' },
      h('option', { value: '' }, `Networks saved on this computer (${saved.length})…`),
      saved.map((s) => h('option', { value: s }, s === cur ? `${s}  (connected)` : s)));
    sel.value = saved.includes(n.ssid) ? n.ssid : '';
    sel.addEventListener('change', () => { if (sel.value) { n.ssid = sel.value; n.pass = ''; this.msg = null; this.render(); } });
    return sel;
  }

  renderStep2() {
    const nets = this.nets.filter((n) => n.ssid);
    return h('div', { class: 'wz-page' },
      h('p', {}, 'The light will get these networks:'),
      h('ul', { class: 'wz-list' }, nets.map((n) => h('li', {}, h('b', {}, n.ssid), n.pass ? ` — password ${'•'.repeat(Math.min(n.pass.length, 12))}` : ' — open network (no password)'))),
      this.device
        ? h('p', {}, 'Press ', h('b', {}, 'Save to light'), ' to send them to ', h('b', {}, this.device.name || 'the light you read from'), '.')
        : h('p', {}, 'Press ', h('b', {}, 'Save to light'), ', choose the light (', h('code', {}, BLE_NAME + '-…'), ') in the browser window and press ', h('b', {}, 'Pair'), ' / ', h('b', {}, 'Connect'), '.'),
      h('div', { class: 'info-note wz-after' }, h('b', {}, 'What happens next: '), 'the light saves the networks, shows "Complete to setup / Change to WiFi mode" and restarts by itself in ', h('b', {}, 'WiFi mode (Artnet)'), '. The Bluetooth connection ends with the restart, so the browser may report an error even though the light got the settings — the wizard checks for the restart.'),
      navigator.bluetooth ? null : h('div', { class: 'build-summary warn' }, 'This browser cannot use Bluetooth. Open Alite2 Studio in Chrome or Edge.'),
      h('div', { class: 'info-note' }, 'If no light shows up: check that the light is in Bluetooth mode, that no phone is connected to it, and that Bluetooth is on and allowed for the browser on this computer.'));
  }

  renderDone() {
    return h('div', { class: 'wz-page' },
      h('div', { class: 'build-summary ok' }, this.unconfirmed
        ? `${this.lightName} got the WiFi settings and is restarting (it dropped the Bluetooth connection right after them — this is normal).`
        : `${this.lightName} received the WiFi settings.`),
      h('p', {}, 'The light saves the networks, shows "Complete to setup / Change to WiFi mode" and restarts by itself in WiFi mode (Artnet). Bluetooth is off in WiFi mode; to change the networks later, switch it back to Bluetooth mode and run WiFi Setup again.'),
      h('ul', { class: 'wz-list' },
        h('li', {}, 'Once connected, its IP address and its 8-character OTA password appear at the bottom of ', h('b', {}, 'Setup → Radio'), ' on the LCD.'),
        h('li', {}, 'If the IP address stays "Disconnected", check the password and that the network is 2.4 GHz, then run WiFi Setup again (Bluetooth mode).')),
      h('div', { class: 'wz-next' },
        h('b', {}, 'Next: update to the latest official firmware, then customize'),
        h('ol', { class: 'wz-list' },
          h('li', {}, 'Wait until the light shows its IP address at the bottom of ', h('b', {}, 'Setup → Radio'), ' (WiFi connected).'),
          h('li', {}, 'Press ', h('b', {}, 'F1'), ' to go to the ', h('b', {}, 'H/W'), ' page, turn the dial to ', h('b', {}, 'Upgrade F/W'), ' and hold ', h('b', {}, 'F2'), '.'),
          h('li', {}, 'The LCD shows "LCD blinks while updating" and the light restarts. While it downloads, the LEDs are off and the backlight blinks — this is normal, do not switch it off. It restarts with the latest official firmware (the version is shown on the H/W page).'),
          h('li', {}, 'Then customize: change the UI here or ask your AI assistant, press ', h('b', {}, '▶ Build'), ' and upload to the light over WiFi with the 8-character OTA password shown under its IP address.')),
        h('div', { class: 'info-note wz-inline' }, `Upgrade F/W works on lights that ran official firmware ${MIN_LIGHT_FW} or later; update older lights (e.g. HDS-15W) to ${MIN_LIGHT_FW} or later first. A light with modified firmware is no longer certified and may not be sold, rented or transferred.`)));
  }
}
