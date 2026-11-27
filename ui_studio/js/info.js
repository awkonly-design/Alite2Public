// Selection info panel: shows what is selected and lets the user edit its layout (position, size, align)
// texts / titles and the image of an image widget. Dropdown / roller options and tabview tabs are shown read-only. Everything else
// (options, tabs, colours, fonts, flags, adding widgets, ...) is changed through the AI assistant (MCP).
import { UNIT, ALIGNS, unescapeText, escapeText } from './project.js';
import { TYPE_LABEL } from './panels.js';
import { h } from './icons.js';
import { MIN_FW_NOTE } from './build.js';

const U = { [UNIT.PX]: 'px', [UNIT.PCT]: '%', [UNIT.CONTENT]: 'content' };
const TEXT_KEY = { LABEL: 'Text', CHECKBOX: 'Title', TABPAGE: 'Title', DROPDOWN: 'Options', ROLLER: 'Options' };

export class InfoPanel {
  constructor(app) {
    this.app = app;
    this.body = document.getElementById('info-body');
  }

  render() {
    const app = this.app, p = app.project;
    this.body.textContent = '';
    if (!p) return;
    const nodes = app.selNodes();
    if (nodes.length !== 1) {
      this.body.append(h('div', { class: 'info-note' }, nodes.length ? `${nodes.length} selected — align them or move them together with the arrow keys.` : 'Click a widget to select it.'));
      this.body.append(this.hint());
      return;
    }
    const n = nodes[0], t = n.saved_objtypeKey;
    const row = (label, value) => h('div', { class: 'ins-row' }, h('label', {}, label), h('div', { class: 'ins-val info-val' }, value));
    this.body.append(row('Name', `${p.name(n)}`), row('Type', TYPE_LABEL[t] || t));
    if (t !== 'SCREEN') {
      const par = p.parent(n);
      if (par) this.body.append(row('Parent', p.name(par)));
    }
    if (t !== 'SCREEN' && t !== 'TABPAGE') {
      const ps = p.pos(n), sz = p.size(n), box = app.canvas.localBox(n);
      const locked = p.isLocked(n);
      const movable = app.canvas.movable([n]).length > 0;
      const sizable = !locked && !!p.prop(n, 'Size') && t !== 'TABPAGE';
      const alignable = !locked && !!p.prop(n, 'Position') && !p.inFlex(n);
      const edit = (label, key, fn) => { fn(); app.commit(`${p.name(n)} ${label}`, key && `${key}:${n.guid}`); };
      const numInput = (value, enabled, onSet, placeholder) => {
        const inp = h('input', { class: 'fld num', type: 'number', value, placeholder: placeholder || '', disabled: !enabled });
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = value; inp.blur(); } });
        inp.addEventListener('change', () => { const v = Math.round(+inp.value); if (inp.value !== '' && Number.isFinite(v)) onSet(v); });
        return inp;
      };
      const unitSelect = (cur, enabled, withContent, onSet) => {
        const opts = [[UNIT.PX, 'px'], [UNIT.PCT, '%'], ...(withContent ? [[UNIT.CONTENT, 'content']] : [])];
        const sel = h('select', { class: 'fld unit', disabled: !enabled }, opts.map(([v, l]) => h('option', { value: v, selected: v === cur }, l)));
        sel.addEventListener('change', () => onSet(+sel.value));
        return sel;
      };
      // convert a value so the widget keeps its place / size when the unit changes
      const convert = (axis, to) => {
        const info = app.canvas.dragInfo(n);
        const base = axis === 'x' || axis === 'w' ? info.pctx.cw : info.pctx.ch;
        if (axis === 'w' || axis === 'h') {
          const px = info.box ? (axis === 'w' ? info.box.w : info.box.h) : 0;
          return to === UNIT.PX ? px : to === UNIT.PCT ? Math.round(px * 100 / Math.max(1, base)) : 1;
        }
        const cur = p.pos(n), v = cur[axis], from = axis === 'x' ? cur.ux : cur.uy;
        if (from === to) return v;
        return to === UNIT.PCT ? Math.round(v * 100 / Math.max(1, base)) : Math.round(v * base / 100);
      };

      // ---- align: dropdown keeps the widget in place, grid buttons snap it to the anchor (x = y = 0)
      const setAlignKeep = (a) => edit('align', null, () => {
        const info = app.canvas.dragInfo(n);
        p.setAlign(n, a);
        if (info.box && !info.flexChild) app.canvas.placeNode(n, info.box.x, info.box.y, null, null, info);
      });
      const setAlignReset = (a) => edit('align', null, () => { p.setAlign(n, a); const c = p.pos(n); p.setPos(n, 0, 0, c.ux, c.uy); });
      const alignSel = h('select', { class: 'fld', disabled: !alignable }, ALIGNS.map((a) => h('option', { value: a, selected: a === p.align(n) }, a)));
      alignSel.addEventListener('change', () => setAlignKeep(alignSel.value));
      const grid = h('div', { class: 'align-grid' + (alignable ? '' : ' disabled') });
      for (const a of ALIGNS) {
        const btn = h('button', { class: p.align(n) === a ? 'on' : '', title: `${a} — moves the widget to this anchor (x = y = 0)`, disabled: !alignable });
        btn.addEventListener('click', () => setAlignReset(a));
        grid.append(btn);
      }

      const posRow = (axis) => h('span', { class: 'xy' }, axis.toUpperCase(),
        numInput(ps[axis], movable, (v) => edit(`position ${axis.toUpperCase()}`, `pos:${axis}`, () => { const c = p.pos(n); p.setPos(n, axis === 'x' ? v : c.x, axis === 'y' ? v : c.y); })),
        unitSelect(axis === 'x' ? ps.ux : ps.uy, movable, false, (u) => edit(`${axis.toUpperCase()} unit`, null, () => { const c = p.pos(n); const v = convert(axis, u); if (axis === 'x') p.setPos(n, v, c.y, u, c.uy); else p.setPos(n, c.x, v, c.ux, u); })));
      const sizeRow = (dim) => {
        const isW = dim === 'w', cur = isW ? sz.uw : sz.uh;
        return h('span', { class: 'xy' }, isW ? 'W' : 'H',
          numInput(cur === UNIT.CONTENT ? '' : sz[dim], sizable, (v) => edit(isW ? 'width' : 'height', `size:${dim}`, () => {
            const c = p.size(n);
            if (isW) p.setSize(n, v, c.h, c.uw === UNIT.CONTENT ? UNIT.PX : c.uw, c.uh); else p.setSize(n, c.w, v, c.uw, c.uh === UNIT.CONTENT ? UNIT.PX : c.uh);
          }), 'auto'),
          unitSelect(cur, sizable, true, (u) => edit(isW ? 'width unit' : 'height unit', null, () => {
            const c = p.size(n), v = convert(dim, u);
            if (isW) p.setSize(n, v, c.h, u, c.uh); else p.setSize(n, c.w, v, c.uw, u);
          })));
      };

      this.body.append(
        h('div', { class: 'ins-row' }, h('label', {}, 'Align'), h('div', { class: 'ins-val align-row' }, alignSel, grid)),
        h('div', { class: 'ins-row' }, h('label', {}, 'Position'), h('div', { class: 'ins-val xy-col' }, posRow('x'), posRow('y'))),
        h('div', { class: 'ins-row' }, h('label', {}, 'Size'), h('div', { class: 'ins-val xy-col' }, sizeRow('w'), sizeRow('h'))),
        box ? row('On screen', `${box.x}, ${box.y} · ${box.w}×${box.h}px`) : null,
      );
      if (locked) this.body.append(h('div', { class: 'info-note' }, 'This widget is locked and cannot be changed here.'));
      else if (!movable) this.body.append(h('div', { class: 'info-note' }, 'The position of this widget is set automatically (flex layout or tab).'));
    }
    const key = TEXT_KEY[t];
    if (key === 'Options') this.body.append(this.optionsEditor(n));
    else if (key && t !== 'TABPAGE') this.body.append(this.textEditor(n, key));
    if (t === 'IMAGE') this.body.append(this.imageEditor(n));
    const tv = t === 'TABVIEW' ? n : t === 'TABPAGE' ? p.parent(n) : null;
    if (tv?.saved_objtypeKey === 'TABVIEW') this.body.append(this.tabsEditor(tv));
    const evs = p.events(n);
    if (evs.length) this.body.append(row('Events', `${evs.length} (handled in the firmware code)`));
    this.body.append(this.hint());
  }

  /** Text of a label (multi-line) or title of a checkbox / tab page (single line). */
  textEditor(n, key) {
    const app = this.app, p = app.project;
    const cur = unescapeText(p.str(n, key));
    const multi = n.saved_objtypeKey === 'LABEL';
    const locked = p.isLocked(n);
    const el = multi
      ? h('textarea', { class: 'fld info-options', rows: Math.min(8, Math.max(2, cur.split('\n').length)), spellcheck: false, disabled: locked })
      : h('input', { class: 'fld', spellcheck: false, disabled: locked });
    el.value = cur;
    const apply = () => {
      const v = el.value.replace(/\r/g, '');
      if (v === cur) return;
      p.setStr(n, key, escapeText(v));
      app.commit(`${p.name(n)} ${key.toLowerCase()}`);
    };
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { el.value = cur; el.blur(); }
      if (e.key === 'Enter' && (!multi || e.metaKey || e.ctrlKey)) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener('blur', apply);
    return h('div', { class: 'ins-row options-row' },
      h('label', {}, key === 'Title' ? 'Title' : 'Text'),
      h('div', { class: 'ins-val' }, el,
        h('div', { class: 'info-note' }, (multi ? 'Enter = new line, Ctrl/⌘+Enter or click outside = apply. ' : '') +
          'Korean / Japanese texts live in src/Alite2/multi_language.c (keyed by the English text), and some labels are set at runtime by the firmware — ask your AI assistant to keep them in sync.')));
  }

  /** Image of an image widget: pick a PNG of the project or import a new one into project/assets/. */
  imageEditor(n) {
    const app = this.app, p = app.project;
    const cur = p.str(n, 'Asset');
    const locked = p.isLocked(n);
    const assets = app.assets.list().filter((a) => /\.png$/i.test(a.path));
    const setAsset = (path) => {
      if (path === p.str(n, 'Asset')) return;
      p.setStr(n, 'Asset', path, 5);
      app.commit(`${p.name(n)} image`);
    };
    const sel = h('select', { class: 'fld', disabled: locked },
      !assets.some((a) => a.path === cur) ? h('option', { value: cur, selected: true }, cur ? `${cur} (missing)` : '(none)') : null,
      assets.map((a) => h('option', { value: a.path, selected: a.path === cur }, `${a.name}${a.w ? `  (${a.w}×${a.h})` : ''}`)));
    sel.addEventListener('change', () => setAsset(sel.value));
    const it = app.assets.find(cur);
    const preview = h('div', { class: 'img-preview' }, it ? h('img', { src: it.url, alt: it.name }) : h('span', { class: 'dim' }, 'no image'));
    const file = h('input', { type: 'file', accept: '.png,image/png', style: { display: 'none' } });
    file.addEventListener('change', async () => {
      const f = file.files[0]; file.value = '';
      if (f) await this.importImage(f, setAsset);
    });
    const importBtn = h('button', { class: 'btn small', disabled: locked, onclick: () => file.click() }, 'Import PNG…');
    return h('div', { class: 'ins-row options-row' },
      h('label', {}, 'Image'),
      h('div', { class: 'ins-val' }, sel, preview, h('div', { class: 'img-actions' }, importBtn, file),
        h('div', { class: 'info-note' }, 'Imported images are saved to ui_studio/project/assets/ and exported as ui_img_<name>_png. Some images (e.g. the WiFi / battery icons) are switched at runtime by the firmware.')));
  }

  async importImage(f, setAsset) {
    const app = this.app;
    if (!/\.png$/i.test(f.name)) { app.toast('Only PNG images are supported', 'warn'); return; }
    const name = f.name.replace(/[^\w.-]/g, '_');
    const path = 'assets/' + name;
    if (app.assets.find(path) && !(await app.confirm(`${name} already exists. Replace it? Every widget using it will show the new image.`))) return;
    try {
      const base64 = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result).split(',')[1] || ''); fr.onerror = () => reject(fr.error); fr.readAsDataURL(f); });
      await app.bridge.request('save_asset', { name, base64 });
      app.assets.add(path, f);
      app.log(`Image imported: ${path}`, 'ok');
      setAsset(path);
      app.info.render();
    } catch (e) { app.toast('Import failed: ' + e.message, 'error'); }
  }

  /** Tabs of a tabview (read-only): click an index to show / select that tab. Adding, removing and renaming tabs is done by
   *  the AI assistant, because the firmware switches tabs by index and translates the titles. */
  tabsEditor(tv) {
    const app = this.app, p = app.project;
    const list = h('div', { class: 'tabs-list' });
    tv.children.forEach((tp, i) => {
      const inp = h('input', { class: 'fld', spellcheck: false, readonly: true, title: p.name(tp) });
      inp.value = unescapeText(p.str(tp, 'Title'));
      const sel = app.selection.includes(tp.guid);
      const show = () => { app.view.activeTab.set(tv.guid, i); app.select([tp.guid]); app.canvas.render(); };
      list.append(h('div', { class: 'tab-row' + (sel ? ' selected' : '') },
        h('span', { class: 'tab-idx', title: p.name(tp), onclick: show }, String(i)), inp));
    });
    return h('div', { class: 'ins-row options-row' },
      h('label', {}, 'Tabs'),
      h('div', { class: 'ins-val' }, list,
        h('div', { class: 'info-note' }, 'Read-only. The firmware switches tabs by index (ui_ScreenState.ino) and translates tab titles in multi_language.c — ask your AI assistant to add, remove or rename tabs so the code stays in sync.')));
  }

  /** Dropdown / roller options (read-only): the firmware uses the option index and translates the options. */
  optionsEditor(n) {
    const p = this.app.project;
    const cur = unescapeText(p.str(n, 'Options'));
    const ta = h('textarea', { class: 'fld info-options', rows: Math.min(10, Math.max(3, cur.split('\n').length)), spellcheck: false, readonly: true });
    ta.value = cur;
    return h('div', { class: 'ins-row options-row' },
      h('label', {}, 'Options'),
      h('div', { class: 'ins-val' }, ta,
        h('div', { class: 'info-note' }, 'Read-only. The firmware uses the option order (index) and translated options live in src/Alite2/multi_language.c — ask your AI assistant to change the options so both stay in sync.')));
  }

  hint() {
    return h('div', { class: 'info-hint' },
      h('b', {}, 'What you can do here'), h('br'), 'Move (drag, arrow keys), resize (handles, Ctrl/⌘+arrows), set align, position and size, edit texts and images, save (Ctrl/⌘+S).',
      h('br'), h('br'),
      h('b', {}, 'Everything else: ask your AI assistant'), h('br'),
      'Dropdown / roller options, tabs, colours, fonts, adding or removing widgets, translations and exporting to the firmware are done by Claude Code / Codex over MCP.',
      h('br'), h('span', { class: 'dim' }, 'e.g. "Make the percentage label on MainScreen bigger and export it to the firmware"'),
      h('br'), h('br'),
      h('b', {}, 'Light firmware 1.2.6 or later'), h('br'), MIN_FW_NOTE);
  }
}
