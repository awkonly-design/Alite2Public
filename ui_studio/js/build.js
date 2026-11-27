// Build & upload dialog: save → export UI → compile → pick lights on the network → WiFi upload, with live progress.
// The work runs in the server (mcp/server.js + mcp/firmware.js); it pushes {type:'job'} state messages to every tab.
import { h } from './icons.js';

const devKey = (d) => `${d.ip}:${d.port || 3232}`;
const STATUS_ICON = { pending: '○', running: '◐', done: '✓', error: '✕', skipped: '–' };
const STAGE_TEXT = { invite: 'Contacting the light…', auth: 'Checking the password…', connect: 'Waiting for the light to connect…', upload: 'Uploading…', finish: 'Writing and checking…' };
// Each light shows its own 8-character OTA password on its LCD: Setup > Radio page, at the bottom under the IP address
// (it changes with the light's IP address). Old factory firmware lights (HDS-15W, below 1.2.6) cannot be updated.
const OTA_PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OTA_PW_HELP = "Enter the 8-character OTA password shown on the light's LCD: Setup → Radio page, at the bottom under the IP address";
const PW_WHERE = 'On the light\'s LCD open Setup → Radio: the 8-character password is at the bottom of the page, under the IP address. It changes when the light\'s IP address changes.';
const OLD_FW_MSG = 'Old factory firmware (HDS-15W, below 1.2.6) — update this light to firmware 1.2.6 or later first.';
const cleanPw = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const validPw = (v) => v.length === 8 && [...v].every((c) => OTA_PW_ALPHABET.includes(c));
const needsPw = (d) => !d.factory;
const unsupported = (d) => !!d.factory;   // HDS-15W: below 1.2.6
// Lights need firmware 1.2.6 or later (OTA password on the LCD, Upgrade F/W back to the official firmware).
export const MIN_LIGHT_FW = '1.2.6';
export const MIN_FW_NOTE = `Alite2Public can be used on lights with firmware ${MIN_LIGHT_FW} or later: they show the WiFi OTA password on the LCD (Setup → Radio page, at the bottom under the IP address) and can go back to the official firmware with Setup → H/W → Upgrade F/W. Update older lights (e.g. HDS-15W) to ${MIN_LIGHT_FW} or later first.`;

export class BuildDialog {
  constructor(app) {
    this.app = app;
    this.state = null;
    this.selected = new Set();   // device keys (ip:port) chosen for upload
    this.manual = [];            // devices added by IP
    this.known = new Set();      // devices already shown once (new Alite2 lights get pre-selected)
    this.showLog = false;
    this.view = 'build';         // 'build': compile progress only, 'update': pick lights and upload only
    this.fromBuild = false;      // update view reached with Next (Back returns to the build view)
    this.ipDraft = '';
    this.passwords = new Map();  // device key -> OTA password typed for it (memory only, never stored: it changes with the IP)
    this.pwPrompt = null;        // device keys shown in the password window (open while not null)
    this.layer = h('div', { id: 'build-layer', class: 'build-layer' });
    document.body.append(this.layer);
    this.layer.addEventListener('mousedown', (e) => { if (e.target === this.layer && !this.state?.running && !this.pwPrompt) this.close(); });
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen || e.key !== 'Escape') return;
      e.stopPropagation();
      if (this.pwPrompt) { this.pwPrompt = null; this.render(); } else if (!this.state?.running) this.close();
    }, true);
  }

  get isOpen() { return this.layer.classList.contains('open'); }
  open() { this.layer.classList.add('open'); this.render(); }
  close() { this.pwPrompt = null; this.layer.classList.remove('open'); }

  /** Toolbar "Build": show the running job, or save and start a new build. */
  async start() {
    const app = this.app;
    if (!app.project) return;
    if (!app.bridge.connected) { app.toast('Not connected to the Alite2 Studio server (ui_studio/run.sh)', 'error'); return; }
    try { this.state = await app.bridge.request('job_state', {}); } catch { /* ignore */ }
    if (this.state?.running) { this.view = this.state.phase === 'upload' ? 'update' : 'build'; this.open(); return; }
    this.view = 'build'; this.fromBuild = false; this.showLog = false;
    this.open();
    if (app.dirty && !(await app.save())) return;
    app.project.data.selected_screen = app.currentScreen;
    try { await app.bridge.request('build_start', { text: app.project.serialize() }); }
    catch (e) { app.toast('Build failed to start: ' + e.message, 'error'); }
  }

  /** Toolbar "Upload": upload the last build again without compiling (the UI is not exported either). */
  async startUpload() {
    const app = this.app;
    if (!app.bridge.connected) { app.toast('Not connected to the Alite2 Studio server (ui_studio/run.sh)', 'error'); return; }
    try { this.state = await app.bridge.request('job_state', {}); } catch { /* ignore */ }
    if (this.state?.running) { this.view = this.state.phase === 'upload' ? 'update' : 'build'; this.open(); return; }
    this.view = 'update'; this.fromBuild = false; this.showLog = false;
    this.open();
    try { await app.bridge.request('upload_prepare', {}); }
    catch (e) { app.toast(e.message, 'error'); this.close(); }
  }

  /** Job state pushed by the server. */
  update(state) {
    const prevPhase = this.state?.phase;
    this.state = state;
    // a build started elsewhere (MCP build_firmware) shows the build view, an upload the update view
    if (state.running && state.phase !== prevPhase) {
      if (state.phase === 'build') { this.view = 'build'; this.fromBuild = false; }
      else if (state.phase === 'upload') this.view = 'update';
    }
    for (const d of state.devices || []) {
      const k = devKey(d);
      if (!this.known.has(k)) { this.known.add(k); if (d.alite2 && !unsupported(d)) this.selected.add(k); }
    }
    if (state.running && !this.isOpen) { this.view = state.phase === 'upload' ? 'update' : 'build'; this.open(); }
    if (this.isOpen) this.render();
  }

  devices() {
    const list = [...(this.state?.devices || [])];
    for (const m of this.manual) if (!list.some((d) => devKey(d) === devKey(m))) list.push(m);
    return list;
  }

  async rescan() {
    try { await this.app.bridge.request('devices_scan', {}); } catch (e) { this.app.toast('Scan failed: ' + e.message, 'error'); }
  }

  /** Upload button: ask for the OTA password of every selected light that needs one, then upload. */
  uploadSelected() {
    const sel = this.devices().filter((d) => this.selected.has(devKey(d)) && !unsupported(d));
    if (!sel.length) return;
    const need = sel.filter(needsPw);
    if (!need.length) { this.sendUpload(); return; }
    this.pwPrompt = need.map(devKey);
    this.pwFocusFirst = true;
    this.render();
  }

  /** Password window "Upload": check the passwords and start the upload. */
  confirmPasswords() {
    const sel = this.devices().filter((d) => this.selected.has(devKey(d)) && !unsupported(d));
    const missing = sel.filter((d) => needsPw(d) && !validPw(this.passwords.get(devKey(d)) || ''));
    if (missing.length) {
      this.app.toast(`${OTA_PW_HELP}: ${missing.map((d) => d.name).join(', ')}`, 'warn');
      this.layer.querySelector(`.dev-pw[data-key="${CSS.escape(devKey(missing[0]))}"]`)?.focus();
      return;
    }
    this.pwPrompt = null;
    this.sendUpload();
  }

  async sendUpload() {
    const sel = this.devices().filter((d) => this.selected.has(devKey(d)) && !unsupported(d));
    if (!sel.length) return;
    const targets = sel.map((d) => ({ ip: d.ip, port: d.port || 3232, name: d.name, factory: !!d.factory, password: needsPw(d) ? this.passwords.get(devKey(d)) : undefined }));
    try { await this.app.bridge.request('upload_start', { targets }); }
    catch (e) { this.app.toast('Upload failed to start: ' + e.message, 'error'); }
  }

  addManual(ip) {
    ip = ip.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { this.app.toast('Enter an IP address like 192.168.0.42', 'warn'); return; }
    this.ipDraft = '';
    const m = { name: ip, host: ip, ip, port: 3232, alite2: null, manual: true };
    if (!this.devices().some((d) => devKey(d) === devKey(m))) this.manual.push(m);
    this.selected.add(devKey(m));
    this.render();
  }

  /** Build view "Next": go to the update view. */
  next() { this.view = 'update'; this.fromBuild = true; this.showLog = false; this.render(); }
  back() { this.view = 'build'; this.pwPrompt = null; this.render(); }

  // ---------------------------------------------------------------- rendering
  bar(progress, status, text) {
    const pct = Math.round((progress || 0) * 100);
    return h('div', { class: 'pbar ' + (status || '') }, h('div', { class: 'pbar-fill', style: { width: pct + '%' } }), h('span', { class: 'pbar-text' }, status === 'error' ? 'failed' : text || pct + '%'));
  }

  async cancelUpload() {
    try { await this.app.bridge.request('upload_cancel', {}); } catch (e) { this.app.toast('Cancel failed: ' + e.message, 'error'); }
  }

  render() {
    const st = this.state || { steps: [], devices: [], uploads: {}, log: [] };
    const running = !!st.running;
    const built = ['built', 'upload', 'done'].includes(st.phase) || (st.phase === 'error' && !!Object.keys(st.uploads || {}).length);
    const uploading = st.phase === 'upload' && running;
    const notesScroll = this.layer.querySelector('.build-notes')?.scrollTop || 0;
    this.layer.textContent = '';

    // ---- steps
    const steps = h('div', { class: 'build-steps' }, (st.steps.length ? st.steps : [{ label: 'Preparing…', status: 'running', progress: 0 }]).map((s) =>
      h('div', { class: 'build-step ' + s.status },
        h('span', { class: 'bs-icon' }, STATUS_ICON[s.status] || '○'),
        h('span', { class: 'bs-label' }, s.label),
        this.bar(s.progress, s.status),
        s.detail ? h('div', { class: 'bs-detail' }, s.detail) : null)));

    // ---- devices
    const devs = this.devices();
    const uploads = st.uploads || {};
    const devRows = devs.map((d) => {
      const k = devKey(d), u = uploads[k];
      const cb = h('input', { type: 'checkbox', checked: this.selected.has(k) && !unsupported(d), disabled: running || unsupported(d) });
      cb.addEventListener('change', () => { if (cb.checked) this.selected.add(k); else this.selected.delete(k); this.render(); });
      const pw = h('span', { class: 'dev-pw-state', title: needsPw(d) ? OTA_PW_HELP : OLD_FW_MSG },
        !needsPw(d) ? '' : validPw(this.passwords.get(k) || '') ? '🔑 entered' : '🔑 needed');
      return h('label', { class: 'dev-row' + (d.alite2 === false || unsupported(d) ? ' other' : '') },
        cb,
        h('span', { class: 'dev-name' }, d.name, h('small', {}, ` ${d.ip}${(d.port || 3232) !== 3232 ? ':' + d.port : ''}`)),
        h('span', { class: 'dev-tag' + (d.recovery ? ' recovery' : '') }, d.recovery ? 'Recovery mode' : d.factory ? 'Old factory F/W' : d.newFactory ? 'New factory firmware' : d.alite2 ? `Alite2 v${d.version}` : d.manual ? 'manual' : 'other device'),
        pw,
        u ? this.bar(u.progress, u.status, u.status === 'running' && u.stage && u.stage !== 'upload' ? STAGE_TEXT[u.stage] : '') : h('span', { class: 'dev-spacer' }),
        u?.status === 'error' ? h('div', { class: 'dev-error' }, u.error) : unsupported(d) ? h('div', { class: 'dev-error' }, OLD_FW_MSG) : null);
    });
    const hadFocus = document.activeElement?.classList?.contains('bd-ip');
    const ipIn = h('input', { class: 'fld bd-ip', placeholder: 'IP address, e.g. 192.168.0.42', spellcheck: false });
    ipIn.value = this.ipDraft;
    ipIn.addEventListener('input', () => { this.ipDraft = ipIn.value; });
    ipIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { this.addManual(ipIn.value); } });
    const devices = h('div', { class: 'build-devices' + (built ? '' : ' muted') },
      h('div', { class: 'bd-head' },
        h('b', {}, 'Lights on the WiFi network'),
        h('span', { class: 'bd-scan' }, st.scanning ? 'scanning…' : `${devs.length} found`),
        h('button', { class: 'btn small', disabled: st.scanning || running, onclick: () => this.rescan() }, 'Rescan')),
      devRows.length ? h('div', { class: 'dev-list' }, devRows)
        : h('div', { class: 'info-note' }, st.scanning ? 'Looking for lights…' : 'No light found. Put the light in WiFi mode (Setup → Radio → Artnet, hold F2) on the same network as this computer, then Rescan — or add its IP below.'),
      h('div', { class: 'bd-manual' }, ipIn, h('button', { class: 'btn small', disabled: running, onclick: () => this.addManual(ipIn.value) }, 'Add')));
    // long explanations: below the lights and their gauges, in their own scrolling box
    const notes = h('div', { class: 'build-notes' },
      devRows.length ? h('div', { class: 'info-note' }, PW_WHERE + ' You enter it after pressing Upload.') : null,
      h('div', { class: 'build-summary warn fw-note' }, MIN_FW_NOTE));

    // ---- summary / log
    const nSel = devs.filter((d) => this.selected.has(devKey(d)) && !unsupported(d)).length;
    const up = Object.values(uploads);
    const isUpdate = this.view === 'update';
    const uploadErr = st.phase === 'error' && (!!up.length || isUpdate);
    let summary = '';
    if (!isUpdate) {
      if (st.phase === 'error' && !uploadErr) summary = st.error || 'Failed';
      else if (st.phase === 'build' && running) summary = 'Building…';
      else if (built) summary = `Build OK${st.summary ? ' — ' + st.summary : ''}. Press Next to update the lights.`;
    } else {
      if (uploadErr) summary = st.error || 'Failed';
      else if (uploading) summary = `Uploading to ${up.length} light(s)…`;
      else if (st.phase === 'built') summary = 'Select the lights to update.';
      else if (st.phase === 'done' && st.cancelled) summary = 'Upload cancelled.';
      else if (st.phase === 'done') { const ok = up.filter((u) => u.status === 'done').length; summary = `${ok} of ${up.length} light(s) updated${ok ? ' — they restart with the new firmware.' : ''}`; }
    }
    const isErr = isUpdate ? uploadErr : st.phase === 'error' && !uploadErr;
    const errs = isUpdate ? [] : (st.errors || []).slice(0, 8);
    const logBox = this.showLog && !isUpdate ? h('pre', { class: 'build-log' }, (st.log || []).slice(-120).join('\n')) : null;
    const logBtn = h('button', { class: 'btn', onclick: () => { this.showLog = !this.showLog; this.render(); } }, this.showLog ? 'Hide log' : 'Show log');
    const closeBtn = h('button', { class: 'btn', disabled: running, onclick: () => this.close() }, 'Close');

    const foot = isUpdate
      ? h('div', { class: 'modal-foot' },
        h('span', { style: { flex: '1' } }),
        uploading ? h('button', { class: 'btn', onclick: () => this.cancelUpload() }, 'Cancel upload') : null,
        this.fromBuild ? h('button', { class: 'btn', disabled: running, onclick: () => this.back() }, 'Back') : null,
        closeBtn,
        h('button', { class: 'btn primary', disabled: running || !built || !nSel, onclick: () => this.uploadSelected() }, nSel ? `Upload to ${nSel} light${nSel > 1 ? 's' : ''}` : 'Upload'))
      : h('div', { class: 'modal-foot' },
        logBtn,
        h('span', { style: { flex: '1' } }),
        closeBtn,
        h('button', { class: 'btn', disabled: running, onclick: () => this.start() }, 'Build again'),
        h('button', { class: 'btn primary', disabled: running || !built, onclick: () => this.next() }, 'Next ›'));

    const fwInfo = st.summary ? h('div', { class: 'info-note' }, 'Firmware: ' + st.summary) : null;
    const summaryBox = summary ? h('div', { class: 'build-summary ' + (isErr ? 'error' : st.phase === 'done' && isUpdate ? 'ok' : '') }, summary) : null;
    const body = isUpdate
      ? h('div', { class: 'modal-body build-body' },
        fwInfo,
        summaryBox,
        st.warning ? h('div', { class: 'build-summary warn' }, '⚠ ' + st.warning) : null,
        devices,
        notes)
      : h('div', { class: 'modal-body build-body' },
        steps,
        summaryBox,
        errs.length ? h('pre', { class: 'build-errors' }, errs.join('\n')) : null,
        st.warning ? h('div', { class: 'build-summary warn' }, '⚠ ' + st.warning) : null,
        logBox);
    this.layer.append(h('div', { class: 'modal build-modal' }, h('div', { class: 'modal-head' }, isUpdate ? 'Update lights' : 'Build firmware'), body, foot));
    const pwWin = this.pwPrompt && !running ? this.renderPwPrompt() : null;
    if (pwWin) this.layer.append(pwWin.el);
    if (logBox) logBox.scrollTop = logBox.scrollHeight;
    const notesEl = this.layer.querySelector('.build-notes');
    if (notesEl) notesEl.scrollTop = notesScroll;
    if (hadFocus) { ipIn.focus(); ipIn.setSelectionRange(ipIn.value.length, ipIn.value.length); }
    if (pwWin?.focus) { const { el, pos } = pwWin.focus; el.focus(); const p = pos ?? el.value.length; el.setSelectionRange(p, p); }
  }

  /** Password window: one 8-character OTA password per selected light that needs one. */
  renderPwPrompt() {
    const devs = this.devices().filter((d) => this.pwPrompt.includes(devKey(d)) && this.selected.has(devKey(d)));
    if (!devs.length) { this.pwPrompt = null; return null; }
    const act = document.activeElement;
    const focused = act?.classList?.contains('dev-pw') ? { key: act.dataset.key, pos: act.selectionStart } : null;
    let focus = null;
    const inputs = [];
    const rows = devs.map((d) => {
      const k = devKey(d), val = this.passwords.get(k) || '';
      const pw = h('input', { class: 'fld dev-pw' + (val && !validPw(val) ? ' invalid' : ''), placeholder: 'XXXXXXXX', maxlength: 8, spellcheck: false, autocomplete: 'off', autocapitalize: 'characters', title: OTA_PW_HELP, 'data-key': k });
      pw.value = val;
      inputs.push(pw);
      pw.addEventListener('input', () => {
        const pos = pw.selectionStart, v = cleanPw(pw.value);
        if (v !== pw.value) { pw.value = v; pw.setSelectionRange(Math.min(pos, v.length), Math.min(pos, v.length)); }
        if (v) this.passwords.set(k, v); else this.passwords.delete(k);
        pw.classList.toggle('invalid', !!v && !validPw(v));
        if (validPw(v)) { const i = inputs.indexOf(pw); if (inputs[i + 1] && !validPw(inputs[i + 1].value)) inputs[i + 1].focus(); }
      });
      pw.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') { this.pwPrompt = null; this.render(); }
        if (e.key === 'Enter') { e.preventDefault(); this.confirmPasswords(); }
      });
      if (focused?.key === k) focus = { el: pw, pos: focused.pos };
      return h('div', { class: 'pw-row' },
        h('span', { class: 'dev-name' }, d.name, h('small', {}, ` ${d.ip}`)),
        h('span', { class: 'dev-tag' + (d.recovery ? ' recovery' : '') }, d.recovery ? 'Recovery mode' : d.newFactory ? 'Factory firmware' : d.version ? `Alite2 v${d.version}` : ''),
        pw);
    });
    if (!focus && (this.pwFocusFirst || !focused)) {
      const first = inputs.find((i) => !validPw(i.value)) || inputs[0];
      focus = { el: first, pos: first.value.length };
    }
    this.pwFocusFirst = false;
    const el = h('div', { class: 'pw-layer' },
      h('div', { class: 'modal pw-modal' },
        h('div', { class: 'modal-head' }, 'WiFi OTA password'),
        h('div', { class: 'modal-body' },
          h('div', { class: 'info-note' }, PW_WHERE),
          h('div', { class: 'info-note pw-fw' }, `Lights need firmware ${MIN_LIGHT_FW} or later.`),
          h('div', { class: 'pw-list' }, rows)),
        h('div', { class: 'modal-foot' },
          h('button', { class: 'btn', onclick: () => { this.pwPrompt = null; this.render(); } }, 'Cancel'),
          h('button', { class: 'btn primary', onclick: () => this.confirmPasswords() }, `Upload to ${this.devices().filter((d) => this.selected.has(devKey(d)) && !unsupported(d)).length} light(s)`))));
    return { el, focus };
  }
}
