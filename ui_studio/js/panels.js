// Screens, Hierarchy, Console and History panels (view / select only; editing is done through MCP).
import { h, icon, wicon } from './icons.js';

export const TYPE_LABEL = {
  SCREEN: 'Screen', ARC: 'Arc', BUTTON: 'Button', IMAGE: 'Image', LABEL: 'Label', PANEL: 'Panel', CONTAINER: 'Container',
  TEXTAREA: 'Textarea', TABVIEW: 'Tabview', TABPAGE: 'Tabpage', CALENDAR: 'Calendar', CHECKBOX: 'Checkbox', COLORWHEEL: 'Colorwheel',
  DROPDOWN: 'Dropdown', IMGBUTTON: 'Image button', KEYBOARD: 'Keyboard', ROLLER: 'Roller', SLIDER: 'Slider', SWITCH: 'Switch',
  SPINBOX: 'Spinbox', BAR: 'Bar', CHART: 'Chart', SPINNER: 'Spinner', STARTEVENTS: 'Initial actions',
};

// ------------------------------------------------------------------ Hierarchy
export class Hierarchy {
  constructor(app) {
    this.app = app;
    this.body = document.getElementById('hier-body');
    this.search = document.getElementById('hier-search');
    this.collapsed = new Set();
    this.search.addEventListener('input', () => this.render());
    this.body.addEventListener('mousedown', (e) => { if (e.target === this.body) this.app.select([]); });
    document.getElementById('hier-tools').append(
      h('button', { class: 'tb-btn', title: 'Expand all', html: icon('plus'), onclick: () => { this.collapsed.clear(); this.render(); } }),
    );
  }

  render() {
    const app = this.app, p = app.project;
    this.body.textContent = '';
    if (!p) return;
    const scr = p.get(app.currentScreen);
    if (!scr) return;
    const q = this.search.value.trim().toLowerCase();
    const match = (n) => !q || p.name(n).toLowerCase().includes(q) || (n.saved_objtypeKey || '').toLowerCase().includes(q);
    const visible = new Set();
    if (q) p.walk(scr, (n) => { if (match(n)) { visible.add(n); p.ancestors(n).forEach((a) => visible.add(a)); } });
    const sel = new Set(app.selection);
    const frag = document.createDocumentFragment();
    const walk = (n, depth, parentDim) => {
      if (q && !visible.has(n)) return;
      const hasKids = n.children?.length > 0;
      const open = q ? true : !this.collapsed.has(n.guid);
      const hidden = p.isHidden(n);
      const row = h('div', { class: 'tree-row' + (sel.has(n.guid) ? ' selected' : '') + (hidden || parentDim ? ' dim' : ''), 'data-guid': n.guid, style: { paddingLeft: 4 + depth * 14 + 'px' } },
        h('span', { class: 'caret' + (open ? ' open' : ''), html: hasKids ? icon('chevron') : '', onmousedown: (e) => { e.stopPropagation(); if (!hasKids) return; this.collapsed[open ? 'add' : 'delete'](n.guid); this.render(); } }),
        h('span', { class: 'ticon', html: wicon(n.saved_objtypeKey) }),
        h('span', { class: 'tree-name' }, p.name(n)),
        p.isLocked(n) ? h('span', { class: 'row-btn on', title: 'Locked (cannot be moved)', html: icon('lock') }) : null,
      );
      row.addEventListener('mousedown', (e) => this.onRowDown(e, n));
      row.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!sel.has(n.guid)) app.select([n.guid]); app.showCanvasMenu(e.clientX, e.clientY, n); });
      frag.append(row);
      if (hasKids && open) for (const c of n.children) walk(c, depth + 1, hidden || parentDim);
    };
    walk(scr, 0, false);
    this.body.append(frag);
  }

  onRowDown(e, n) {
    if (e.button !== 0) return;
    const app = this.app, p = app.project;
    if (e.shiftKey && app.selection.length) {
      const rows = [...this.body.querySelectorAll('.tree-row')].map((r) => r.dataset.guid);
      const a = rows.indexOf(app.selection[app.selection.length - 1]), b = rows.indexOf(n.guid);
      if (a >= 0 && b >= 0) { const [i, j] = a < b ? [a, b] : [b, a]; app.select(rows.slice(i, j + 1).filter((g) => p.get(g).saved_objtypeKey !== 'SCREEN')); return; }
    }
    if (e.metaKey || e.ctrlKey) {
      if (app.selection.includes(n.guid)) app.select(app.selection.filter((g) => g !== n.guid));
      else app.select([...app.selection.filter((g) => p.get(g)?.saved_objtypeKey !== 'SCREEN'), n.guid]);
      return;
    }
    app.select([n.guid], { reveal: true });
  }

  reveal(guid) {
    const p = this.app.project, n = p?.get(guid);
    if (!n) return;
    let changed = false;
    for (const a of p.ancestors(n)) if (this.collapsed.delete(a.guid)) changed = true;
    if (changed) this.render();
    this.body.querySelector(`[data-guid="${guid}"]`)?.scrollIntoView({ block: 'nearest' });
  }
}

// ------------------------------------------------------------------ Screens
export class ScreensPanel {
  constructor(app) {
    this.app = app;
    this.body = document.getElementById('screens-body');
  }
  render() {
    const app = this.app, p = app.project;
    this.body.textContent = '';
    if (!p) return;
    for (const s of p.screens()) {
      const row = h('div', { class: 'tree-row' + (s.guid === app.currentScreen ? ' selected' : ''), 'data-guid': s.guid, style: { paddingLeft: '8px' } },
        h('span', { class: 'ticon', html: wicon('SCREEN') }),
        h('span', { class: 'tree-name' }, p.name(s)),
        h('span', { class: 'tree-type' }, String(s.children.length)),
      );
      row.addEventListener('mousedown', (e) => { if (e.button === 0) app.select([s.guid], { reveal: true }); });
      this.body.append(row);
    }
  }
}

// ------------------------------------------------------------------ Console
export class ConsolePanel {
  constructor() { this.body = document.getElementById('console-body'); }
  log(msg, level = 'info') {
    const t = new Date().toTimeString().slice(0, 8);
    this.body.append(h('div', { class: 'log-line ' + level }, h('span', { class: 't' }, t), msg));
    while (this.body.childNodes.length > 500) this.body.firstChild.remove();
    this.body.scrollTop = this.body.scrollHeight;
  }
  clear() { this.body.textContent = ''; }
}

// ------------------------------------------------------------------ History
export class HistoryPanel {
  constructor(app) { this.app = app; this.body = document.getElementById('history-body'); }
  render() {
    const hist = this.app.history;
    this.body.textContent = '';
    if (!this.app.project) return;
    hist.entries().forEach((e, i) => {
      this.body.append(h('div', { class: 'hist-item' + (e.idx === 0 ? ' current' : e.idx > 0 ? ' future' : ''), onclick: () => this.app.historyJump(e.idx) },
        h('span', { class: 'n' }, String(i)), e.label));
    });
    this.body.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
  }
}
