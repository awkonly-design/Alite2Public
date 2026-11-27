// Guided tour: balloon tips over each part of Alite2 Studio, one step at a time.
// Shown once on the first start (after the firmware notice); the ? button in the toolbar shows it again.
import { h } from './icons.js';

const DONE_KEY = 'alite2-tour-done';

const STEPS = [
  { title: 'Welcome to Alite2 Studio', text: 'A quick tour of the editor for the ALITE 2 screen and firmware. Use Next / Back (or the arrow keys); Esc closes the tour. You can see it again any time with the ? button at the top right.' },
  { target: '#panel-screens', title: 'Screens', text: 'Every screen of the light\'s 170×320 LCD. Click one to show it on the canvas.' },
  { target: '#panel-hierarchy', title: 'Structure', text: 'The widgets of the selected screen. Click to select, search by name. Locked widgets (🔒, e.g. the regulatory information on QrScreen) cannot be changed.' },
  { target: '#canvas-viewport', title: 'Canvas', text: 'The screen as it looks on the light. Drag widgets to move them, drag the handles to resize, use the arrow keys for 1 px steps. Mouse wheel / pinch zooms, Space + drag pans.' },
  { target: ['#toolbar [data-cmd="save"]', '#toolbar [data-cmd="distV"]'], title: 'Save, undo, align', text: 'Save the project (Ctrl/⌘+S), undo / redo, and align or distribute the selected widgets.' },
  { target: '#panel-inspector', title: 'Selection', text: 'Position, size, align, text and image of the selected widget. Colours, fonts, new widgets, options and translations: ask your AI assistant.' },
  { target: '.play-btn', title: '▶ Play — simulator', text: 'Runs your UI like the real light: turn and press the F1 / F2 dials, and watch the light output on three pixels. Great for trying menus and light effects before you flash anything.' },
  { target: '.wifi-btn', title: 'WiFi Setup', text: 'Gives a light the WiFi network it should join, over Bluetooth (Chrome / Edge). Needed once before updating over WiFi.' },
  { target: '.build-btn', title: '▶ Build', text: 'Saves the UI, exports it into the firmware (src/Alite2/), compiles it and then uploads it to the lights it finds on your WiFi network.' },
  { target: '.upload-btn', title: '⇪ Upload', text: 'Uploads the last build again without compiling. Each light needs the 8-character OTA password shown on its LCD (Setup → Radio).' },
  { target: '#mcp-status', title: 'AI (MCP)', text: 'Green when an AI assistant (Claude Code or Codex) is connected. Ask it for anything the editor does not do by hand — and watch it edit the UI here live.' },
  { target: '#panel-bottom', title: 'Console & History', text: 'Messages from the editor, the build and the AI assistant, and the list of changes (click one to go back to it).' },
  { target: '.help-btn', title: 'Help', text: 'Open this tour again or show the keyboard shortcuts. Have fun building your own light!' },
];

export class Tour {
  constructor(app) {
    this.app = app;
    this.layer = null;
    this.i = 0;
    this.onKey = (e) => this.key(e);
    this.onResize = () => this.place();
  }

  get seen() { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; } }
  markSeen() { try { localStorage.setItem(DONE_KEY, '1'); } catch { /* private window: shown again next time */ } }

  /** First start only. */
  startIfNew() { if (!this.seen) this.start(); }

  start() {
    if (this.app.simulator?.active) this.app.simulator.stop();
    this.close(false);
    this.i = 0;
    this.layer = h('div', { class: 'tour-layer' });
    this.spot = h('div', { class: 'tour-spot' });
    this.balloon = h('div', { class: 'tour-balloon', role: 'dialog', 'aria-live': 'polite' });
    this.layer.append(this.spot, this.balloon);
    this.layer.addEventListener('mousedown', (e) => { if (e.target === this.layer || e.target === this.spot) e.preventDefault(); });
    document.body.append(this.layer);
    document.addEventListener('keydown', this.onKey, true);
    window.addEventListener('resize', this.onResize);
    this.show();
  }

  close(done = true) {
    if (!this.layer) return;
    document.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.onResize);
    this.layer.remove();
    this.layer = null;
    if (done) this.markSeen();
  }

  go(d) {
    const n = this.i + d;
    if (n < 0) return;
    if (n >= STEPS.length) { this.close(); return; }
    this.i = n;
    this.show();
  }

  key(e) {
    if (!this.layer) return;
    e.stopPropagation();   // editor shortcuts are off while the tour is shown
    if (e.key === 'Tab') return;
    e.preventDefault();
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') this.go(1);
    else if (e.key === 'ArrowLeft') this.go(-1);
  }

  show() {
    const s = STEPS[this.i], last = this.i === STEPS.length - 1;
    this.balloon.textContent = '';
    this.balloon.append(
      h('div', { class: 'tour-arrow' }),
      h('div', { class: 'tour-head' }, h('span', { class: 'tour-step' }, `${this.i + 1} / ${STEPS.length}`), h('button', { class: 'tour-x', title: 'Close the tour (Esc)', onclick: () => this.close() }, '×')),
      h('div', { class: 'tour-title' }, s.title),
      h('div', { class: 'tour-text' }, s.text),
      h('div', { class: 'tour-dots' }, STEPS.map((_, k) => h('span', { class: 'tour-dot' + (k === this.i ? ' on' : k < this.i ? ' done' : ''), onclick: () => { this.i = k; this.show(); } }))),
      h('div', { class: 'tour-foot' },
        this.i === 0 ? h('button', { class: 'btn', onclick: () => this.close() }, 'Skip') : h('button', { class: 'btn', onclick: () => this.go(-1) }, '‹ Back'),
        h('span', { style: { flex: '1' } }),
        h('button', { class: 'btn primary tour-next', onclick: () => this.go(1) }, last ? 'Done' : this.i === 0 ? 'Start tour ›' : 'Next ›')));
    this.place();
    setTimeout(() => this.balloon?.querySelector('.tour-next')?.focus(), 0);
  }

  /** Bounding box of the step's target(s), or null for a centred balloon. */
  rect(s) {
    const sels = s.target ? [].concat(s.target) : [];
    const rs = sels.map((q) => document.querySelector(q)).filter((el) => el && el.offsetParent !== null).map((el) => el.getBoundingClientRect());
    if (!rs.length) return null;
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
    return { left: l, top: t, right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) };
  }

  place() {
    if (!this.layer) return;
    const s = STEPS[this.i], r = this.rect(s), b = this.balloon, gap = 14, pad = 6, M = 10;
    const bw = b.offsetWidth, bh = b.offsetHeight, W = innerWidth, H = innerHeight;
    b.dataset.side = '';
    if (!r) {
      Object.assign(this.spot.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0', height: '0' });
      Object.assign(b.style, { left: (W - bw) / 2 + 'px', top: (H - bh) / 2 + 'px' });
      return;
    }
    Object.assign(this.spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.right - r.left + 2 * pad + 'px', height: r.bottom - r.top + 2 * pad + 'px' });
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    // the side with the most room that fits the balloon
    const room = { bottom: H - r.bottom, top: r.top, right: W - r.right, left: r.left };
    const fits = { bottom: room.bottom >= bh + gap + M, top: room.top >= bh + gap + M, right: room.right >= bw + gap + M, left: room.left >= bw + gap + M };
    const side = ['bottom', 'right', 'left', 'top'].find((k) => fits[k]) || 'inside';
    let x, y;
    if (side === 'bottom' || side === 'top') { x = cx - bw / 2; y = side === 'bottom' ? r.bottom + pad + gap : r.top - pad - gap - bh; }
    else if (side === 'right' || side === 'left') { y = cy - bh / 2; x = side === 'right' ? r.right + pad + gap : r.left - pad - gap - bw; }
    else { x = cx - bw / 2; y = cy - bh / 2; }   // large target: balloon in its middle
    x = Math.max(M, Math.min(x, W - bw - M));
    y = Math.max(M, Math.min(y, H - bh - M));
    Object.assign(b.style, { left: x + 'px', top: y + 'px' });
    b.dataset.side = side;
    const arrow = b.querySelector('.tour-arrow');
    if (side === 'bottom' || side === 'top') { arrow.style.left = Math.max(16, Math.min(cx - x, bw - 16)) + 'px'; arrow.style.top = ''; }
    else if (side === 'right' || side === 'left') { arrow.style.top = Math.max(16, Math.min(cy - y, bh - 16)) + 'px'; arrow.style.left = ''; }
  }
}
