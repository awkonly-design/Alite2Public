// Alite2 Studio — application shell.
// The editor is a viewer with light layout tools: select, move (drag / arrows / X,Y), align, distribute, undo, save.
// All other edits (adding widgets, texts, sizes, styles, export to the firmware) are made by the AI assistant over MCP;
// the structure-edit methods below stay because the MCP bridge (bridge.js) calls them.
import { Project, UNIT, CONTAINER_TYPES } from './project.js';
import { TEMPLATES } from './templates.js';
import { Assets } from './assets.js';
import { History } from './history.js';
import { Canvas, isTyping } from './canvas.js';
import { Hierarchy, ScreensPanel, ConsolePanel, HistoryPanel, TYPE_LABEL } from './panels.js';
import { InfoPanel } from './info.js';
import { BuildDialog, MIN_LIGHT_FW } from './build.js';
import { WifiDialog } from './wifi.js';
import { Simulator, SIM_KEYS } from './simulator.js';
import { Tour } from './tour.js';
import { PALETTE, PALETTE_NAMES } from './render.js';
import { h, icon, wicon } from './icons.js';
import { Bridge } from './bridge.js';

const $ = (id) => document.getElementById(id);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl+';
// The canvas always shows only the current screen (showAll is kept false).
const loadSettings = () => { try { return { snap: true, pixelated: false, ...JSON.parse(localStorage.getItem('lvs-settings') || '{}'), showAll: false }; } catch { return { snap: true, showAll: false, pixelated: false }; } };

const DEFAULT_SIZE = {
  BUTTON: [100, 50, UNIT.PX, UNIT.PX], PANEL: [100, 50, UNIT.PX, UNIT.PX], LABEL: [1, 1, UNIT.CONTENT, UNIT.CONTENT],
  SLIDER: [150, 10, UNIT.PX, UNIT.PX], BAR: [150, 10, UNIT.PX, UNIT.PX], ARC: [150, 150, UNIT.PX, UNIT.PX],
  SWITCH: [50, 25, UNIT.PX, UNIT.PX], SPINNER: [80, 80, UNIT.PX, UNIT.PX], TEXTAREA: [150, 70, UNIT.PX, UNIT.PX],
  DROPDOWN: [150, 1, UNIT.PX, UNIT.CONTENT], ROLLER: [1, 1, UNIT.CONTENT, UNIT.CONTENT], CHECKBOX: [1, 1, UNIT.CONTENT, UNIT.CONTENT],
  IMAGE: [1, 1, UNIT.CONTENT, UNIT.CONTENT], SPINBOX: [70, 40, UNIT.PX, UNIT.PX], KEYBOARD: [100, 40, UNIT.PCT, UNIT.PCT],
  TABVIEW: [100, 100, UNIT.PCT, UNIT.PCT],
};

class App {
  constructor() {
    this.project = null;
    this.assets = new Assets(() => { this.canvas.render(); this.info?.render(); });
    this.history = new History(200);
    this.selection = [];
    this.currentScreen = null;
    this.view = { activeTab: new Map(), revealGuids: new Set() };
    this.settings = loadSettings();
    this.dirty = false; this.backupDone = false;

    this.console = new ConsolePanel();
    this.canvas = new Canvas(this);
    this.hierarchy = new Hierarchy(this);
    this.screensPanel = new ScreensPanel(this);
    this.historyPanel = new HistoryPanel(this);
    this.info = new InfoPanel(this);
    this.buildDialog = new BuildDialog(this);
    this.wifiDialog = new WifiDialog(this);
    this.simulator = new Simulator(this);
    this.tour = new Tour(this);
    this.bridge = new Bridge(this);

    this.buildToolbar();
    this.bindGlobal();
    this.bindSplitters();
    this.bindBottomTabs();
    this.refreshAll();
    this.log('Alite2 Studio started');
    this.loadFromServer({ initial: true });
    this.showFirmwareNotice();
  }

  /** Shown every time Studio opens: lights need firmware 1.2.6+. Closes only with OK (no Escape / outside click). */
  showFirmwareNotice() {
    const layer = h('div', { class: 'notice-layer' });
    const kd = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); }
      e.stopPropagation(); e.preventDefault();   // nothing reaches the editor while the notice is open
    };
    // after OK: the guided tour on the first start
    const close = () => { document.removeEventListener('keydown', kd, true); layer.remove(); this.tour.startIfNew(); };
    const ok = h('button', { class: 'btn primary notice-ok', onclick: close }, 'OK');
    layer.append(h('div', { class: 'modal notice-modal', role: 'alertdialog', 'aria-modal': 'true' },
      h('div', { class: 'notice-hero' },
        h('img', { src: 'img/alite2-hero.jpg', alt: 'ALITE 2' }),
        h('div', { class: 'notice-hero-text' },
          h('span', { class: 'notice-kicker' }, 'Before you start'),
          h('div', { class: 'notice-title' }, `Light firmware ${MIN_LIGHT_FW} or later required`))),
      h('div', { class: 'modal-body' },
        h('p', {}, 'Alite2 Studio and the Alite2Public firmware work without problems only on lights running firmware ', h('b', {}, `${MIN_LIGHT_FW} or later`), '.'),
        h('p', {}, 'Check the version on the light: ', h('b', {}, 'Setup → H/W'), ' page. Update older lights (e.g. HDS-15W) to ', h('b', {}, `${MIN_LIGHT_FW} or later`), ' before you build or upload anything.'),
        h('div', { class: 'build-summary error' }, h('b', {}, 'Problems caused by using a light with firmware older than ' + MIN_LIGHT_FW + ' cannot be repaired.'))),
      h('div', { class: 'modal-foot' }, ok)));
    document.body.append(layer);
    document.addEventListener('keydown', kd, true);
    setTimeout(() => ok.focus(), 0);
  }

  // ================================================================ logging/status
  log(msg, level = 'info') { this.console.log(msg, level); }
  toast(msg, level = 'info') { $('status-msg').textContent = msg; this.log(msg, level); clearTimeout(this._toastT); this._toastT = setTimeout(() => { $('status-msg').textContent = 'Ready'; }, 4000); }
  setCursor(x, y) { $('status-cursor').textContent = `x ${x}  y ${y}`; }
  onZoom(z) { $('status-zoom').textContent = Math.round(z * 100) + '%'; const zi = $('zoom-field'); if (zi && document.activeElement !== zi) zi.value = Math.round(z * 100) + '%'; }
  saveSettings() { try { localStorage.setItem('lvs-settings', JSON.stringify(this.settings)); } catch { /* ignore */ } }

  // ================================================================ project lifecycle
  async loadProject(project, src = {}) {
    if (this.dirty && !(await this.confirm('There are unsaved changes. Continue?'))) return false;
    this.project = project;
    this.history.reset(project.serialize());
    this.view.activeTab.clear();
    const selScreen = project.data.selected_screen && project.get(project.data.selected_screen);
    this.currentScreen = (selScreen || project.screens()[0])?.guid || null;
    this.selection = this.currentScreen ? [this.currentScreen] : [];
    this.setDirty(false);
    $('welcome').classList.add('hidden');
    const info = project.info;
    $('project-title').textContent = `Alite2 UI — ${info.width}×${info.height}`;
    this.canvas.render();
    this.refreshAll();
    requestAnimationFrame(() => this.canvas.fitScreen());
    const counts = {};
    project.walk(project.root, (n) => { if (n.saved_objtypeKey && n.saved_objtypeKey !== 'ELEMENT') counts[n.saved_objtypeKey] = (counts[n.saved_objtypeKey] || 0) + 1; });
    this.log(`Loaded Alite2 UI (${project.screens().length} screens, ${Object.values(counts).reduce((a, b) => a + b, 0)} widgets, ${this.assets.list().length} images)`, 'ok');
    const unknown = Object.keys(counts).filter((t) => !TYPE_LABEL[t]);
    if (unknown.length) this.log(`Unknown widget types (drawn as boxes): ${unknown.join(', ')}`, 'warn');
    return true;
  }

  setDirty(d) { this.dirty = d; $('dirty-flag').textContent = d ? '● Unsaved' : ''; document.title = (d ? '● ' : '') + 'Alite2 Studio'; }

  /** Record a change: snapshot into history, mark dirty and refresh UI. */
  commit(label, key = null, opts = {}) {
    if (!this.project) return;
    this.project.reindex();
    const changed = this.history.commit(label, this.project.serialize(), key);
    if (!changed) { this.refreshAll(opts); return; }
    this.setDirty(true);
    this.refreshAll(opts);
  }

  refreshAll(opts = {}) {
    const p = this.project;
    if (p) {
      this.selection = this.selection.filter((g) => p.get(g));
      if (!p.get(this.currentScreen)) this.currentScreen = p.screens()[0]?.guid || null;
      this.updateReveal();
      if (opts.canvas !== false) this.canvas.render();
    }
    this.canvas.drawOverlay();
    this.hierarchy.render();
    this.screensPanel.render();
    this.info.render();
    this.historyPanel.render();
    this.updateStatus();
    this.updateToolbar();
  }

  updateReveal() {
    const p = this.project, set = new Set();
    for (const g of this.selection) {
      const n = p.get(g); if (!n) continue;
      set.add(g);
      for (const a of p.ancestors(n)) set.add(a.guid);
    }
    this.view.revealGuids = set;
  }

  restore(state) {
    const sel = this.selection, cur = this.currentScreen;
    const p = new Project(JSON.parse(state), this.project.fileName);
    this.project = p;
    this.selection = sel.filter((g) => p.get(g));
    this.currentScreen = p.get(cur) ? cur : p.screens()[0]?.guid;
    this.setDirty(true);
    this.refreshAll();
  }
  undo() { const s = this.history.undo(); if (s) { this.restore(s); this.toast('Undo: ' + (this.history.future[this.history.future.length - 1]?.label || '')); } }
  redo() { const s = this.history.redo(); if (s) { this.restore(s); this.toast('Redo: ' + this.history.currentLabel); } }
  historyJump(idx) {
    let s = null;
    while (idx < 0) { s = this.history.undo() ?? s; idx++; }
    while (idx > 0) { s = this.history.redo() ?? s; idx--; }
    if (s) this.restore(s);
  }

  // ================================================================ selection
  select(guids, opts = {}) {
    const p = this.project;
    if (!p) return;
    guids = [...new Set(guids)].filter((g) => p.get(g));
    const prevReveal = this.view.revealGuids;
    this.selection = guids;
    const prim = p.get(guids[guids.length - 1]);
    let needRender = false;
    if (prim) {
      const scr = p.screenOf(prim);
      if (scr && scr.guid !== this.currentScreen) {
        this.currentScreen = scr.guid;
        if (!this.settings.showAll) needRender = true;
        this.canvas.updateCurrentMarker();
      }
      // show the tab page that contains the selection
      for (const a of [prim, ...p.ancestors(prim)]) {
        const par = p.parent(a);
        if (par?.saved_objtypeKey === 'TABVIEW') {
          const i = par.children.indexOf(a);
          if (this.view.activeTab.get(par.guid) !== i) { this.view.activeTab.set(par.guid, i); needRender = true; }
        }
      }
    }
    this.updateReveal();
    const hiddenChanged = [...prevReveal, ...this.view.revealGuids].some((g) => prevReveal.has(g) !== this.view.revealGuids.has(g) && p.get(g) && p.isHidden(p.get(g)));
    if (needRender) this.canvas.render();
    else if (hiddenChanged) this.canvas.refresh([...prevReveal, ...this.view.revealGuids].filter((g) => p.get(g)));
    if (!opts.silentCanvas) this.canvas.drawOverlay();
    this.hierarchy.render();
    this.screensPanel.render();
    if (!opts.silentCanvas) this.info.render();
    if (opts.reveal && prim) {
      this.hierarchy.reveal(prim.guid);
      if (prim.saved_objtypeKey === 'SCREEN') this.canvas.revealScreen(prim.guid);
    }
    this.updateStatus();
    this.updateToolbar();
  }
  selNodes() { return this.selection.map((g) => this.project?.get(g)).filter(Boolean); }
  primary() { const s = this.selNodes(); return s[s.length - 1]; }
  widgetSel() { return this.selNodes().filter((n) => n.saved_objtypeKey !== 'SCREEN' && n.saved_objtypeKey !== 'STARTEVENTS'); }

  updateStatus() {
    const n = this.primary(), p = this.project;
    if (!n || !p) { $('status-sel').textContent = ''; return; }
    const b = this.canvas.localBox(n);
    const extra = this.selection.length > 1 ? ` (+${this.selection.length - 1})` : '';
    $('status-sel').textContent = `${p.name(n)} · ${TYPE_LABEL[n.saved_objtypeKey] || n.saved_objtypeKey}${b ? ` · ${b.x}, ${b.y} · ${b.w}×${b.h}` : ''}${extra}`;
  }

  // ================================================================ structure edits
  targetContainer(prefer) {
    const p = this.project;
    let n = prefer || this.primary() || p.get(this.currentScreen);
    if (!n) return null;
    if (n.saved_objtypeKey === 'STARTEVENTS') n = p.get(this.currentScreen);
    while (n && !CONTAINER_TYPES.has(n.saved_objtypeKey)) n = p.parent(n);
    return n || p.get(this.currentScreen);
  }

  addWidget(type, parent, opts = {}) {
    const p = this.project;
    if (!p) { this.toast('No project loaded', 'warn'); return; }
    if (!TEMPLATES[type]) { this.toast(`${TYPE_LABEL[type] || type}: this widget type cannot be added`, 'warn'); return; }
    if (type === 'SCREEN') {
      const scr = p.addScreen();
      opts.configure?.(scr);
      this.currentScreen = scr.guid;
      this.selection = [scr.guid];
      this.commit(`${opts.label || ''}Add screen ${p.name(scr)}`, null);
      this.canvas.revealScreen(scr.guid);
      return scr;
    }
    if (type === 'TABPAGE') {
      const tv = parent?.saved_objtypeKey === 'TABVIEW' ? parent : null;
      if (!tv) { this.toast('A Tabpage can only be added to a Tabview', 'warn'); return; }
      const tp = p.createNode('TABPAGE');
      p.setStr(tp, 'Title', 'Tab ' + (tv.children.length + 1));
      p.insert(tp, tv);
      opts.configure?.(tp);
      this.view.activeTab.set(tv.guid, tv.children.length - 1);
      this.selection = [tp.guid];
      this.commit(`${opts.label || ''}Add tab ${p.name(tp)}`);
      return tp;
    }
    parent = this.targetContainer(parent);
    if (!parent) return;
    const node = p.createNode(type, { size: DEFAULT_SIZE[type], align: 'CENTER', pos: [0, 0, UNIT.PX, UNIT.PX] });
    if (type === 'LABEL') p.setStr(node, 'Text', 'Text');
    if (type === 'IMAGE' && opts.asset) p.setStr(node, 'Asset', opts.asset, 5);
    p.insert(node, parent);
    if (type === 'TABVIEW') {
      for (let i = 1; i <= 2; i++) { const tp = p.createNode('TABPAGE'); p.setStr(tp, 'Title', 'Tab ' + i); p.insert(tp, node); }
    }
    if (type === 'BUTTON' && opts.withLabel) { /* buttons get no label by default */ }
    if (opts.at) {
      const off = this.canvas.centerOffset(parent, opts.at);
      p.setPos(node, off.x, off.y, UNIT.PX, UNIT.PX);
    }
    opts.configure?.(node);
    this.selection = [node.guid];
    this.commit(`${opts.label || ''}Add ${TYPE_LABEL[type]} ${p.name(node)}`);
    this.hierarchy.reveal(node.guid);
    return node;
  }

  deleteNodes(nodes) {
    const p = this.project;
    nodes = nodes.filter((n) => n && n.saved_objtypeKey !== 'STARTEVENTS' && !p.isLocked(n));
    if (!nodes.length) return;
    const screens = nodes.filter((n) => n.saved_objtypeKey === 'SCREEN');
    if (screens.length && p.screens().length - screens.length < 1) { this.toast('The last screen cannot be deleted', 'warn'); return; }
    const top = nodes.filter((n) => !p.ancestors(n).some((a) => nodes.includes(a)));
    const par = p.parent(top[0]);
    for (const n of top) p.remove(n);
    this.selection = par && p.get(par.guid) && par !== p.root ? [par.guid] : [];
    this.commit(top.length > 1 ? `Delete ${top.length} items` : `Delete ${p.name(top[0])}`);
  }

  duplicate(nodes = this.selNodes()) {
    const p = this.project;
    nodes = nodes.filter((n) => n.saved_objtypeKey !== 'STARTEVENTS');
    if (!nodes.length) return;
    const top = nodes.filter((n) => !p.ancestors(n).some((a) => nodes.includes(a)));
    const out = [];
    for (const n of top) {
      const c = p.clone(n);
      const par = p.parent(n);
      if (n.saved_objtypeKey === 'SCREEN') { c.editor_posx = (n.editor_posx || 0) + 40; c.editor_posy = (n.editor_posy || 0) + 40; }
      p.insert(c, par, par.children.indexOf(n) + 1);
      out.push(c.guid);
    }
    this.selection = out;
    this.commit(`Duplicate ${out.length} items`);
  }
  duplicateScreen() { const s = this.project?.get(this.currentScreen); if (s) this.duplicate([s]); }
  deleteScreen() { const s = this.project?.get(this.currentScreen); if (s) this.deleteNodes([s]); }

  moveNodes(guids, newParent, index, label) {
    const p = this.project;
    const nodes = guids.map((g) => p.get(g)).filter(Boolean).filter((n) => !p.ancestors(n).some((a) => guids.includes(a.guid)));
    let moved = 0;
    for (const n of nodes) {
      if (n === newParent || p.isAncestor(n, newParent)) continue;
      const isScr = n.saved_objtypeKey === 'SCREEN';
      if (isScr !== (newParent === p.root)) continue;
      if ((newParent.saved_objtypeKey === 'TABVIEW') !== (n.saved_objtypeKey === 'TABPAGE')) continue;
      const before = p.parent(n), bi = before.children.indexOf(n);
      if (p.move(n, newParent, index)) { moved++; index = newParent.children.indexOf(n) + 1; if (before === newParent && bi === newParent.children.indexOf(n)) moved--; }
    }
    if (moved) this.commit(label || (moved > 1 ? `Move ${moved} items` : `Reparent ${p.name(nodes[0])}`));
    else this.refreshAll({ canvas: false });
  }

  // ================================================================ arrange
  arrangeTargets() {
    const p = this.project;
    const nodes = this.canvas.movable(this.widgetSel());
    const prim = this.primary();
    const scr = prim && p.screenOf(prim);
    return nodes.filter((n) => p.screenOf(n) === scr);
  }

  alignSel(mode) {
    const nodes = this.arrangeTargets();
    if (!nodes.length) return;
    const infos = nodes.map((n) => this.canvas.dragInfo(n)).filter((i) => i.box);
    let ref;
    if (infos.length === 1) {
      const i = infos[0];
      ref = { x: i.origin.x, y: i.origin.y, w: i.pctx.cw, h: i.pctx.ch };
    } else {
      const x0 = Math.min(...infos.map((i) => i.box.x)), y0 = Math.min(...infos.map((i) => i.box.y));
      const x1 = Math.max(...infos.map((i) => i.box.x + i.box.w)), y1 = Math.max(...infos.map((i) => i.box.y + i.box.h));
      ref = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    for (const i of infos) {
      const b = i.box;
      let x = b.x, y = b.y;
      if (mode === 'left') x = ref.x;
      if (mode === 'centerH') x = Math.round(ref.x + (ref.w - b.w) / 2);
      if (mode === 'right') x = ref.x + ref.w - b.w;
      if (mode === 'top') y = ref.y;
      if (mode === 'middle') y = Math.round(ref.y + (ref.h - b.h) / 2);
      if (mode === 'bottom') y = ref.y + ref.h - b.h;
      this.canvas.placeNode(i.node, x, y, null, null, i);
    }
    const names = { left: 'left', centerH: 'center', right: 'right', top: 'top', middle: 'middle', bottom: 'bottom' };
    this.commit(`Align ${names[mode]}${infos.length === 1 ? ' (to parent)' : ''}`);
  }

  distribute(axis) {
    const infos = this.arrangeTargets().map((n) => this.canvas.dragInfo(n)).filter((i) => i.box);
    if (infos.length < 3) { this.toast('Select 3 or more widgets to distribute', 'warn'); return; }
    const k = axis === 'h' ? 'x' : 'y', s = axis === 'h' ? 'w' : 'h';
    infos.sort((a, b) => a.box[k] - b.box[k]);
    const first = infos[0].box, last = infos[infos.length - 1].box;
    const total = infos.reduce((a, i) => a + i.box[s], 0);
    const gap = (last[k] + last[s] - first[k] - total) / (infos.length - 1);
    let cur = first[k];
    for (const i of infos) {
      const v = Math.round(cur);
      this.canvas.placeNode(i.node, k === 'x' ? v : i.box.x, k === 'y' ? v : i.box.y, null, null, i);
      cur += i.box[s] + gap;
    }
    this.commit(axis === 'h' ? 'Distribute horizontally' : 'Distribute vertically');
  }

  sameSize(dim) {
    const infos = this.arrangeTargets().map((n) => this.canvas.dragInfo(n)).filter((i) => i.box);
    const prim = this.primary();
    const ref = infos.find((i) => i.node === prim) || infos[infos.length - 1];
    if (infos.length < 2 || !ref) { this.toast('Select 2 or more widgets (the last one is the reference)', 'warn'); return; }
    for (const i of infos) {
      if (i === ref) continue;
      this.canvas.placeNode(i.node, i.box.x, i.box.y, dim === 'w' ? ref.box.w : null, dim === 'h' ? ref.box.h : null, { ...i, box: { ...i.box, w: dim === 'w' ? ref.box.w : i.box.w, h: dim === 'h' ? ref.box.h : i.box.h } });
    }
    this.commit(dim === 'w' ? 'Same width' : 'Same height');
  }

  zorder(mode) {
    const p = this.project;
    const nodes = this.widgetSel().filter((n) => n.saved_objtypeKey !== 'TABPAGE');
    if (!nodes.length) return;
    const ordered = mode === 'front' || mode === 'forward' ? [...nodes].reverse() : nodes;
    for (const n of ordered) {
      const par = p.parent(n), arr = par.children, i = arr.indexOf(n);
      let j = { front: arr.length - 1, back: 0, forward: Math.min(arr.length - 1, i + 1), backward: Math.max(0, i - 1) }[mode];
      arr.splice(i, 1); arr.splice(j, 0, n);
    }
    this.commit({ front: 'Bring to front', back: 'Send to back', forward: 'Bring forward', backward: 'Send backward' }[mode]);
  }

  nudge(dx, dy, resize) {
    const p = this.project;
    const nodes = resize ? this.widgetSel().filter((n) => !p.isLocked(n)) : this.canvas.movable(this.widgetSel());
    if (!nodes.length) return;
    for (const n of nodes) {
      if (resize) {
        const s = p.size(n), b = this.canvas.localBox(n);
        let { w, h: hh, uw, uh } = s;
        if (dx) { if (uw === UNIT.CONTENT) { w = b?.w ?? 0; uw = UNIT.PX; } w = Math.max(1, w + dx); }
        if (dy) { if (uh === UNIT.CONTENT) { hh = b?.h ?? 0; uh = UNIT.PX; } hh = Math.max(1, hh + dy); }
        p.setSize(n, w, hh, uw, uh);
      } else {
        const ps = p.pos(n);
        p.setPos(n, ps.x + dx, ps.y + dy);
      }
    }
    this.commit(resize ? 'Resize (keyboard)' : 'Move (keyboard)', 'nudge:' + (resize ? 'r' : 'm') + this.selection.join());
  }

  selectAll() {
    const p = this.project, prim = this.primary();
    if (!p) return;
    let par = prim && prim.saved_objtypeKey !== 'SCREEN' ? p.parent(prim) : p.get(this.currentScreen);
    if (!par) return;
    this.select(par.children.map((c) => c.guid));
  }
  selectSibling(dir) {
    const p = this.project, prim = this.primary();
    if (!prim) return;
    const par = p.parent(prim);
    if (!par) return;
    const arr = par === p.root ? p.screens() : par.children;
    const i = arr.indexOf(prim);
    const n = arr[(i + dir + arr.length) % arr.length];
    if (n) this.select([n.guid], { reveal: true });
  }
  selectParent() {
    const p = this.project, prim = this.primary();
    if (!prim) return;
    const par = p.parent(prim);
    if (par && par !== p.root) this.select([par.guid], { reveal: true });
    else this.select([]);
  }

  // ================================================================ project load / save / export
  // The editor only edits the Alite2 UI: ui_studio/project/alite2_ui.json (+ assets/), served by mcp/server.js.
  async loadFromServer({ initial = false, force = false } = {}) {
    try {
      const r = await fetch('/api/project', { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.text()) || r.statusText);
      const proj = await r.json();
      if (!force && this.dirty && !(await this.confirm('Discard unsaved changes and reload the project from disk?'))) return false;
      const project = Project.fromText(proj.text, proj.fileName);
      this.dirty = false;
      this.assets.clear();
      for (const a of proj.assets || []) {
        const bin = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
        this.assets.add(a.path, new File([bin], a.path.split('/').pop(), { type: a.mime }));
      }
      return await this.loadProject(project);
    } catch (e) {
      const msg = location.protocol.startsWith('http') ? e.message : 'This page cannot be opened as a file. Start ui_studio/run.sh and open the URL it prints.';
      $('welcome-msg').textContent = `Could not load the project: ${msg}`;
      if (!initial) this.toast('Could not load the project: ' + msg, 'error');
      return false;
    }
  }

  async save() {
    const p = this.project;
    if (!p) return false;
    p.data.selected_screen = this.currentScreen;
    try {
      const r = await this.bridge.request('save_project', { text: p.serialize() });
      if (r.backup) this.log(`Previous file backed up: ${r.backup}`, 'ok');
      this.setDirty(false);
      this.toast(`Saved: ${r.path}`, 'ok');
      return true;
    } catch (e) {
      this.toast('Save failed: ' + e.message, 'error');
      return false;
    }
  }

  // ================================================================ commands
  cmd(name, arg) {
    const c = this.commands()[name];
    if (c && (!c.enabled || c.enabled())) c.run(arg);
  }
  commands() {
    if (this._cmds) return this._cmds;
    const has = () => !!this.project, sel = () => this.widgetSel().length > 0, any = () => this.selNodes().length > 0;
    this._cmds = {
      save: { run: () => this.save(), enabled: has },
      undo: { run: () => this.undo(), enabled: () => this.history.canUndo() },
      redo: { run: () => this.redo(), enabled: () => this.history.canRedo() },
      selectAll: { run: () => this.selectAll(), enabled: has },
      deselect: { run: () => this.select([]), enabled: has },
      selectParent: { run: () => this.selectParent(), enabled: any },
      alignLeft: { run: () => this.alignSel('left'), enabled: sel },
      alignCenterH: { run: () => this.alignSel('centerH'), enabled: sel },
      alignRight: { run: () => this.alignSel('right'), enabled: sel },
      alignTop: { run: () => this.alignSel('top'), enabled: sel },
      alignMiddle: { run: () => this.alignSel('middle'), enabled: sel },
      alignBottom: { run: () => this.alignSel('bottom'), enabled: sel },
      distH: { run: () => this.distribute('h'), enabled: () => this.widgetSel().length > 2 },
      distV: { run: () => this.distribute('v'), enabled: () => this.widgetSel().length > 2 },
      zoomIn: { run: () => this.canvas.zoomStep(1), enabled: has },
      zoomOut: { run: () => this.canvas.zoomStep(-1), enabled: has },
      zoom100: { run: () => this.canvas.zoomAt(1), enabled: has },
      fit: { run: () => this.canvas.fitScreen(), enabled: has },
      toggleSnap: { run: () => { this.settings.snap = !this.settings.snap; this.saveSettings(); this.updateToolbar(); }, checked: () => this.settings.snap },
      togglePixel: { run: () => { this.settings.pixelated = !this.settings.pixelated; this.saveSettings(); this.canvas.render(); this.updateToolbar(); }, checked: () => this.settings.pixelated },
      shortcuts: { run: () => this.showShortcuts() },
      mcpInfo: { run: () => this.showMcpInfo() },
    };
    return this._cmds;
  }

  // ================================================================ menus / toolbar
  /** Align / distribute entries of the context menu */
  arrangeDefs() {
    return [
      ['Align left', 'alignLeft', 'Alt+A', 'alignLeft'], ['Align center', 'alignCenterH', 'Alt+H', 'alignCenterH'], ['Align right', 'alignRight', 'Alt+D', 'alignRight'],
      ['Align top', 'alignTop', 'Alt+W', 'alignTop'], ['Align middle', 'alignMiddle', 'Alt+V', 'alignMiddle'], ['Align bottom', 'alignBottom', 'Alt+S', 'alignBottom'], '-',
      ['Distribute horizontally', 'distH', '', 'distH'], ['Distribute vertically', 'distV', '', 'distV'],
    ];
  }
  toItems(defs) {
    const C = this.commands();
    return defs.map((d) => (d === '-' ? '-' : { label: d[0], key: d[2], icon: d[3], action: () => this.cmd(d[1]), disabled: C[d[1]]?.enabled && !C[d[1]].enabled(), checked: C[d[1]]?.checked?.() }));
  }
  buildToolbar() {
    const tb = $('toolbar');
    const btn = (ic, cmd, title) => { const b = h('button', { class: 'tb-btn', title, html: icon(ic), 'data-cmd': cmd }); b.addEventListener('click', () => this.cmd(cmd)); return b; };
    const sep = () => h('div', { class: 'tb-sep' });
    tb.append(
      btn('save', 'save', `Save (${MOD}S)`), sep(),
      btn('undo', 'undo', `Undo (${MOD}Z)`), btn('redo', 'redo', `Redo (${MOD}⇧Z)`), sep(),
      h('span', { class: 'tb-label' }, 'Align'),
      btn('alignLeft', 'alignLeft', 'Align left (Alt+A) — a single widget aligns to its parent'), btn('alignCenterH', 'alignCenterH', 'Align center (Alt+H)'), btn('alignRight', 'alignRight', 'Align right (Alt+D)'),
      btn('alignTop', 'alignTop', 'Align top (Alt+W)'), btn('alignMiddle', 'alignMiddle', 'Align middle (Alt+V)'), btn('alignBottom', 'alignBottom', 'Align bottom (Alt+S)'), sep(),
      btn('distH', 'distH', 'Distribute horizontally (3+)'), btn('distV', 'distV', 'Distribute vertically (3+)'),
      h('span', { class: 'tb-label', style: { marginLeft: 'auto', color: 'var(--text-dim)' } }, 'Other edits: ask your AI assistant (MCP)'),
      h('button', { class: 'btn play-btn', title: 'Simulator: run the current UI like the light (F1 / F2 dials) and see the light output', onclick: () => this.simulator.toggle() }, '▶ Play'),
      h('button', { class: 'btn wifi-btn', title: 'Give a light the WiFi network it joins (sent over Bluetooth)', onclick: () => this.wifiDialog.open() }, 'WiFi Setup'),
      h('button', { class: 'btn primary build-btn', title: 'Export the UI, compile the firmware and upload it to lights on the WiFi network', onclick: () => this.buildDialog.start() }, '▶ Build'),
      h('button', { class: 'btn upload-btn', title: 'Upload the last build to lights on the WiFi network (no compiling)', onclick: () => this.buildDialog.startUpload() }, '⇪ Upload'),
      h('button', { class: 'tb-btn help-btn', title: 'Help: guided tour, keyboard shortcuts', style: { fontWeight: '600' }, onclick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        showMenu(r.right - 190, r.bottom + 4, [
          { label: 'Guided tour', action: () => this.tour.start() },
          { label: 'Keyboard shortcuts', key: '?', action: () => this.cmd('shortcuts') },
        ]);
      } }, '?'),
    );
    const ch = $('canvas-head');
    const zoom = h('input', { id: 'zoom-field', class: 'tb-zoom', value: '100%' });
    zoom.addEventListener('change', () => { const v = parseFloat(zoom.value); if (v > 0) this.canvas.zoomAt(v / 100); });
    zoom.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') zoom.blur(); });
    ch.append(
      h('span', { id: 'canvas-screen-label', class: 'tb-label', style: { flex: 1 } }, ''),
      btn('magnet', 'toggleSnap', 'Snap & guides (hold Alt while dragging to disable)'), btn('filter', 'togglePixel', 'Pixel view'), sep(),
      btn('zoomOut', 'zoomOut', 'Zoom out (-)'), zoom, btn('zoomIn', 'zoomIn', 'Zoom in (+)'), btn('fit', 'fit', 'Fit screen (0)'),
    );
  }
  updateToolbar() {
    const C = this.commands();
    document.querySelectorAll('[data-cmd]').forEach((b) => {
      const c = C[b.dataset.cmd]; if (!c || b.tagName !== 'BUTTON' || !b.classList.contains('tb-btn')) return;
      b.disabled = !!(c.enabled && !c.enabled());
      if (c.checked) b.classList.toggle('active', c.checked());
    });
    const p = this.project, s = p?.get(this.currentScreen);
    const label = $('canvas-screen-label');
    if (label) label.textContent = s ? `${p.name(s)}  ·  ${p.width} × ${p.height}` : '';
  }

  showCanvasMenu(x, y, node) {
    const p = this.project; if (!p) return;
    const C = this.commands();
    const it = (label, cmd, key, ic) => ({ label, key, icon: ic, action: () => this.cmd(cmd), disabled: C[cmd]?.enabled && !C[cmd].enabled() });
    const isW = node && node.saved_objtypeKey !== 'SCREEN';
    showMenu(x, y, [
      ...(isW ? [{ label: 'Align', icon: 'alignCenterH', sub: this.toItems(this.arrangeDefs()) }, '-', it('Select parent', 'selectParent', 'Esc')] : []),
      it('Fit screen', 'fit', '0'),
    ]);
  }

  async showMcpInfo() {
    let st = null;
    try { st = await (await fetch('/bridge/status')).json(); } catch { /* not served by mcp/server.js */ }
    const role = this.bridge.role;
    const pre = (t) => h('pre', { style: { background: 'var(--field)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', userSelect: 'all' } }, t);
    const body = h('div', {},
      h('p', {}, role === 'active' ? '✅ This tab is connected. Commands from your AI assistant (MCP) show up here immediately; each change is one undo step (Ctrl+Z).'
        : role === 'standby' ? '🟡 Connected, but another tab is active. Click this tab to make it the active one.'
          : '⚪ Not connected. Start ui_studio/run.sh.'),
      st ? h('p', {}, `Connected editor tabs: ${st.editors}`) : null,
      h('p', {}, 'Claude Code: run claude in the repository root; .mcp.json registers the alite2-ui server.'),
      h('p', {}, 'Codex (ChatGPT) CLI: add to ~/.codex/config.toml'),
      pre('[mcp_servers.alite2-ui]\ncommand = "node"\nargs = ["<repository path>/ui_studio/mcp/server.js"]'),
      h('p', {}, 'Examples: "Make the INTENSITY label on MainScreen 20px", "Rename the SetupScreen tabs and export to the firmware"'));
    this.modal('AI assistant (MCP)', body, [['Close', true, true]]);
  }

  showShortcuts() {
    const rows = [
      ['Click / Shift·Ctrl+click', 'Select / multi-select'], ['Alt+click', 'Select the parent widget'], ['Drag on an empty screen area', 'Marquee select'],
      ['Drag', 'Move (Shift: lock axis, Alt: no snapping)'], ['Handles', 'Resize (Shift: keep ratio)'], ['Arrows / Shift+arrows', 'Move 1px / 10px'], [MOD + 'arrows (+Shift)', 'Resize 1px / 10px'],
      ['Alt+A / H / D', 'Align left / center / right'], ['Alt+W / V / S', 'Align top / middle / bottom'],
      ['Space+drag / middle-button drag', 'Pan'], ['Wheel / pinch', 'Zoom'], ['0 / 1', 'Fit screen / 100%'],
      [MOD + 'Z / ' + MOD + '⇧Z', 'Undo / redo'], [MOD + 'S', 'Save'], ['Tab / Shift+Tab', 'Next / previous sibling'], ['Esc', 'Select parent'],
    ];
    const table = (list) => h('table', { class: 'kbd-table' }, list.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))));
    this.modal('Shortcuts', h('div', {}, table(rows), h('div', { class: 'kbd-section' }, 'Simulator (▶ Play)'), table(SIM_KEYS)), [['Close', true]]);
  }

  // ================================================================ modals
  modal(title, body, buttons, onKey) {
    return new Promise((resolve) => {
      const layer = $('modal-layer');
      layer.textContent = '';
      const close = (v) => { layer.classList.remove('open'); layer.textContent = ''; document.removeEventListener('keydown', kd, true); resolve(v); };
      const foot = h('div', { class: 'modal-foot' }, buttons.map(([label, val, primary]) => h('button', { class: 'btn' + (primary ? ' primary' : ''), onclick: () => close(typeof val === 'function' ? val() : val) }, label)));
      const m = h('div', { class: 'modal' }, h('div', { class: 'modal-head' }, title), h('div', { class: 'modal-body' }, body), foot);
      layer.append(m);
      layer.classList.add('open');
      const kd = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.stopPropagation(); e.preventDefault(); const pb = buttons.find((b) => b[2]); close(pb ? (typeof pb[1] === 'function' ? pb[1]() : pb[1]) : null); }
        e.stopPropagation();
      };
      document.addEventListener('keydown', kd, true);
      layer.onmousedown = (e) => { if (e.target === layer) close(null); };
      setTimeout(() => m.querySelector('input,select,textarea')?.focus(), 0);
      onKey?.(close);
    });
  }
  confirm(msg) { return this.modal('Confirm', h('div', {}, msg), [['Cancel', false], ['Continue', true, true]]).then((v) => !!v); }
  // ================================================================ global bindings
  bindGlobal() {
    window.addEventListener('beforeunload', (e) => { if (this.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', () => this.canvas.drawOverlay());
  }

  onKey(e) {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const k = e.key;
    if (mod && k.toLowerCase() === 's') { e.preventDefault(); this.cmd('save'); return; }
    if (isTyping(e) || $('modal-layer').classList.contains('open')) return;
    if (!this.project) return;
    const run = (c) => { e.preventDefault(); this.cmd(c); };
    if (mod) {
      switch (k.toLowerCase()) {
        case 'z': return run(e.shiftKey ? 'redo' : 'undo');
        case 'y': return run('redo');
        case 'a': return run('selectAll');
        case '=': case '+': return run('zoomIn');
        case '-': return run('zoomOut');
        case '0': return run('fit');
      }
    }
    if (e.altKey && !mod) {
      const m = { KeyA: 'alignLeft', KeyH: 'alignCenterH', KeyD: 'alignRight', KeyW: 'alignTop', KeyV: 'alignMiddle', KeyS: 'alignBottom' }[e.code];
      if (m) return run(m);
    }
    if (k.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
      this.nudge(d[0], d[1], mod);
      return;
    }
    if (mod || e.altKey) return;
    switch (k) {
      case 'Escape': return run('selectParent');
      case 'Tab': e.preventDefault(); return this.selectSibling(e.shiftKey ? -1 : 1);
      case '+': case '=': return run('zoomIn');
      case '-': case '_': return run('zoomOut');
      case '0': return run('fit');
      case '1': return run('zoom100');
      case '?': return run('shortcuts');
    }
  }

  bindSplitters() {
    document.querySelectorAll('.splitter').forEach((sp) => {
      sp.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const id = sp.dataset.resize, invert = !!sp.dataset.invert, vert = sp.classList.contains('v');
        const target = $(id);
        const start = vert ? e.clientX : e.clientY;
        const size0 = vert ? target.getBoundingClientRect().width : target.getBoundingClientRect().height;
        sp.classList.add('dragging');
        const mv = (ev) => {
          const d = (vert ? ev.clientX : ev.clientY) - start;
          const s = Math.max(vert ? 160 : 60, size0 + (invert ? -d : d));
          if (vert) document.documentElement.style.setProperty(id === 'left' ? '--left-w' : '--right-w', s + 'px');
          else target.style.flex = `0 0 ${s}px`;
          this.canvas.drawOverlay();
        };
        const up = () => { sp.classList.remove('dragging'); window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
      });
    });
  }
  bindBottomTabs() {
    const tabs = document.querySelectorAll('#bottom-tabs .tab');
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('active', x === t));
      document.querySelectorAll('#panel-bottom .tab-page').forEach((pg) => pg.classList.toggle('active', pg.dataset.page === t.dataset.tab));
    }));
  }
}

// ================================================================== popup menus
let menuClose = null;
function closeMenus() {
  const layer = $('menu-layer');
  layer.textContent = '';
  layer.style.pointerEvents = 'none';
  document.querySelectorAll('.menu-btn.open').forEach((b) => b.classList.remove('open'));
  menuClose?.(); menuClose = null;
}
function showMenu(x, y, items, onClose) {
  const layer = $('menu-layer');
  layer.textContent = '';
  menuClose = onClose || null;
  layer.style.pointerEvents = 'auto';
  layer.onmousedown = (e) => { if (e.target === layer) closeMenus(); };
  layer.oncontextmenu = (e) => { e.preventDefault(); closeMenus(); };
  const build = (items, px, py, level) => {
    const m = h('div', { class: 'ctx-menu' });
    layer.querySelectorAll('.ctx-menu').forEach((el) => { if (+el.dataset.level >= level) el.remove(); });
    m.dataset.level = level;
    for (const it of items) {
      if (it === '-') { m.append(h('div', { class: 'ctx-sep' })); continue; }
      const row = h('div', { class: 'ctx-item' + (it.disabled ? ' disabled' : '') },
        h('span', { class: 'ic', html: it.checked ? '✓' : it.iconHtml || (it.icon ? icon(it.icon) : '') }),
        h('span', { class: 'label' }, it.label),
        it.key ? h('span', { class: 'key' }, it.key) : null,
        it.sub ? h('span', { class: 'arrow', html: icon('chevron') }) : null);
      row.addEventListener('mouseenter', () => {
        m.querySelectorAll('.ctx-item.open').forEach((r) => r.classList.remove('open'));
        layer.querySelectorAll('.ctx-menu').forEach((el) => { if (+el.dataset.level > level) el.remove(); });
        if (it.sub) { row.classList.add('open'); const r = row.getBoundingClientRect(); build(it.sub, r.right + 2, r.top - 4, level + 1); }
      });
      row.addEventListener('mouseup', (e) => { if (e.button !== 0 && e.button !== 2) return; if (it.sub || it.disabled) return; closeMenus(); it.action?.(); });
      m.append(row);
    }
    layer.append(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(px, innerWidth - r.width - 4)) + 'px';
    m.style.top = Math.max(4, Math.min(py, innerHeight - r.height - 4)) + 'px';
  };
  build(items, x, y, 0);
}

window.app = new App();
