// WebSocket bridge to the Alite2 Studio server (mcp/server.js). Lets an AI assistant (MCP) drive this editor tab.
import { Project, UNIT, ALIGNS, escapeText, unescapeText } from './project.js';
import { TYPE_LABEL } from './panels.js';
import { PALETTE_NAMES } from './render.js';

const UNIT_CODE = { px: UNIT.PX, '%': UNIT.PCT, content: UNIT.CONTENT };
const UNIT_STR = { 1: 'px', 2: '%', 3: 'content' };
const BOOL_KEYS = new Set(['Hidden', 'Clickable', 'Click_focusable', 'Checkable', 'Snappable', 'Press_lock', 'Event_bubble', 'Gesture_bubble', 'Adv_hittest',
  'Ignore_layout', 'Floating', 'Overflow_visible', 'Flex_in_new_track', 'Scrollable', 'Scroll_elastic', 'Scroll_momentum', 'Scroll_on_focus', 'Scroll_chain',
  'Scroll_with_arrow', 'Scroll_one', 'Checked', 'Disabled', 'Focused', 'Pressed', 'User_1', 'User_2', 'User_3', 'User_4']);
const ENUM_KEYS = new Set(['Scrollbar_mode', 'Scroll_direction', 'Scroll_snap_x', 'Scroll_snap_y']);
const TEXT_KEY = { LABEL: 'Text', TEXTAREA: 'Text', CHECKBOX: 'Title', TABPAGE: 'Title', DROPDOWN: 'Options', ROLLER: 'Options' };
const ESCAPED = new Set(['Text', 'Options', 'Placeholder', 'Title']);
const FLEX_ALIGN = ['start', 'center', 'end', 'space_between', 'space_around', 'space_evenly']; // stored order

export class Bridge {
  constructor(app) {
    this.app = app;
    this.ws = null; this.role = 'off'; this.delay = 1000;
    this.reqs = new Map(); this.rid = 1;
    this.el = document.getElementById('mcp-status');
    this.el?.addEventListener('click', () => this.app.showMcpInfo());
    window.addEventListener('focus', () => this.send({ type: 'focus' }));
    if (location.protocol.startsWith('http')) this.connect();
    else this.setRole('off');
  }

  get connected() { return this.ws?.readyState === WebSocket.OPEN; }

  connect() {
    let ws;
    try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/bridge`); }
    catch { this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.delay = 1000; this.app.log('Connected to the Alite2 Studio server', 'ok'); };
    ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (this.role !== 'off') this.app.log('Disconnected from the Alite2 Studio server', 'warn');
      this.ws = null; this.setRole('off');
      for (const r of this.reqs.values()) r.reject(new Error('Bridge disconnected'));
      this.reqs.clear();
      this.retry();
    };
  }
  retry() { setTimeout(() => this.connect(), this.delay); this.delay = Math.min(this.delay * 1.6, 10000); }
  send(msg) { if (this.connected) this.ws.send(JSON.stringify(msg)); }
  setRole(r) {
    this.role = r;
    if (!this.el) return;
    this.el.dataset.state = r;
    this.el.title = { active: 'AI (MCP) connected — this tab receives the assistant\'s commands', standby: 'AI (MCP) connected — another tab is active (click for details)', off: 'Not connected — start the server with ui_studio/run.sh' }[r];
  }

  /** Request to the server (file access). */
  request(method, params) {
    if (!this.connected) return Promise.reject(new Error('Not connected to the Alite2 Studio server (ui_studio/run.sh)'));
    const id = this.rid++;
    return new Promise((resolve, reject) => {
      this.reqs.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ type: 'req', id, method, params }));
    });
  }

  async onMessage(msg) {
    if (msg.type === 'hello' || msg.type === 'role') { this.setRole(msg.role); if (msg.type === 'hello' && document.hasFocus()) this.send({ type: 'focus' }); return; }
    if (msg.type === 'job') { this.app.buildDialog?.update(msg.state); return; }
    if (msg.type === 'res') {
      const r = this.reqs.get(msg.id); if (!r) return;
      this.reqs.delete(msg.id);
      msg.error ? r.reject(new Error(msg.error)) : r.resolve(msg.result);
      return;
    }
    if (msg.type !== 'req') return;
    const fn = this.handlers()[msg.method];
    try {
      if (!fn) throw new Error(`Unknown command: ${msg.method}`);
      if (!['get_state', 'open_project', 'serialize', 'mark_saved'].includes(msg.method) && !this.app.project) throw new Error('The project is not loaded yet. Call reload_project.');
      const result = await fn(msg.params || {});
      this.send({ type: 'res', id: msg.id, result: result ?? { ok: true } });
      if (!['get_state', 'get_tree', 'get_widget', 'list_assets', 'serialize'].includes(msg.method)) this.app.log(`AI: ${msg.method}`, 'info');
    } catch (e) {
      this.send({ type: 'res', id: msg.id, error: e.message || String(e) });
      this.app.log(`AI: ${msg.method} failed — ${e.message}`, 'warn');
    }
  }

  // ---------------------------------------------------------------- helpers
  get p() { return this.app.project; }
  resolve(ref) {
    const p = this.p;
    if (!ref) throw new Error('id is required');
    const byGuid = p.get(ref);
    if (byGuid) return byGuid;
    const hits = [];
    p.walk(p.root, (n) => { if (n !== p.root && p.name(n) === ref) hits.push(n); });
    if (!hits.length) {
      const ci = []; p.walk(p.root, (n) => { if (n !== p.root && p.name(n).toLowerCase() === String(ref).toLowerCase()) ci.push(n); });
      if (ci.length === 1) return ci[0];
      throw new Error(`Widget not found: ${ref}`);
    }
    if (hits.length > 1) throw new Error(`'${ref}' matches ${hits.length} widgets. Use a guid: ${hits.map((n) => n.guid).join(', ')}`);
    return hits[0];
  }
  describe(n, deep = false) {
    const p = this.p, t = n.saved_objtypeKey;
    const out = { name: p.name(n), type: t, guid: n.guid };
    if (t !== 'SCREEN' && t !== 'STARTEVENTS' && t !== 'TABPAGE') {
      const pos = p.pos(n), s = p.size(n);
      Object.assign(out, { x: pos.x, y: pos.y, x_unit: UNIT_STR[pos.ux], y_unit: UNIT_STR[pos.uy], width: s.w, height: s.h, width_unit: UNIT_STR[s.uw], height_unit: UNIT_STR[s.uh], align: p.align(n) });
      if (p.inFlex(n)) out.flex_child = true;
    }
    const tk = TEXT_KEY[t];
    if (tk && p.prop(n, tk)) out.text = unescapeText(p.str(n, tk));
    if (t === 'IMAGE') out.asset = p.str(n, 'Asset');
    if (p.isHidden(n)) out.hidden = true;
    if (p.isLocked(n)) out.locked = true;
    const b = this.app.canvas.localBox(n);
    if (b) out.box = b;
    if (p.layout(n).type === 1) out.layout = 'flex';
    if (deep && n.children?.length) out.children = n.children.map((c) => this.describe(c, true));
    else if (n.children?.length) out.child_count = n.children.length;
    return out;
  }
  refsToNodes(ids) { return (ids || []).map((r) => this.resolve(r)); }

  applyTransform(n, a) {
    const p = this.p;
    const has = (k) => a[k] !== undefined && a[k] !== null;
    if (['x', 'y', 'x_unit', 'y_unit'].some(has)) {
      if (!p.prop(n, 'Position')) throw new Error(`${p.name(n)}: this type has no position`);
      if (a.x_unit === 'content' || a.y_unit === 'content') throw new Error('Position units are px or %');
      const pos = p.pos(n);
      p.setPos(n, has('x') ? a.x : pos.x, has('y') ? a.y : pos.y, UNIT_CODE[a.x_unit] ?? pos.ux, UNIT_CODE[a.y_unit] ?? pos.uy);
    }
    if (['width', 'height', 'width_unit', 'height_unit'].some(has)) {
      if (!p.prop(n, 'Size')) throw new Error(`${p.name(n)}: this type has no size`);
      const s = p.size(n);
      let uw = UNIT_CODE[a.width_unit] ?? s.uw, uh = UNIT_CODE[a.height_unit] ?? s.uh;
      if (has('width') && !a.width_unit && uw === UNIT.CONTENT) uw = UNIT.PX;
      if (has('height') && !a.height_unit && uh === UNIT.CONTENT) uh = UNIT.PX;
      p.setSize(n, has('width') ? a.width : uw === UNIT.CONTENT ? 1 : s.w, has('height') ? a.height : uh === UNIT.CONTENT ? 1 : s.h, uw, uh);
    }
    if (has('align')) {
      if (!ALIGNS.includes(a.align)) throw new Error(`align must be one of: ${ALIGNS.join(', ')}`);
      p.setAlign(n, a.align);
    }
  }
  applyText(n, text) {
    const p = this.p;
    let target = n;
    if (n.saved_objtypeKey === 'BUTTON') target = n.children.find((c) => c.saved_objtypeKey === 'LABEL');
    const key = target && TEXT_KEY[target.saved_objtypeKey];
    if (!key) throw new Error(`${p.name(n)}: this type has no text${n.saved_objtypeKey === 'BUTTON' ? ' (the button has no Label — add a LABEL child)' : ''}`);
    p.setStr(target, key, escapeText(String(text)));
  }
  applyProps(n, props) {
    const p = this.p;
    for (const [key, v] of Object.entries(props || {})) {
      if (key === 'Layout' && v && typeof v === 'object') { this.applyLayout(n, v); continue; }
      const q = p.prop(n, key);
      const it = q?.InheritedType ?? (BOOL_KEYS.has(key) ? 2 : ENUM_KEYS.has(key) ? 3 : null);
      if (it == null) {
        const avail = (n.properties || []).filter((x) => ![1, 11, 15].includes(x.InheritedType) && !x.strtype.startsWith('_')).map((x) => x.strtype.split('/')[1]);
        throw new Error(`${p.name(n)}: unknown property '${key}'. Available: ${[...new Set([...avail, ...BOOL_KEYS])].join(', ')}`);
      }
      switch (it) {
        case 2: p.setBool(n, key, v === true || v === 'True' || v === 'true' || v === 1); break;
        case 3: case 5: case 9: p.setStr(n, key, String(v), it); break;
        case 6: p.setInt(n, key, Math.round(+v)); break;
        case 7: if (!Array.isArray(v)) throw new Error(`${key} must be an array of numbers`); p.setArr(n, key, v.map((x) => Math.round(+x)), q?.flags); break;
        default: p.setStr(n, key, ESCAPED.has(key) ? escapeText(String(v)) : String(v), it);
      }
    }
  }
  applyLayout(n, v) {
    const p = this.p, l = p.layout(n);
    const idx = (s, d) => (s == null ? d : typeof s === 'number' ? s : Math.max(0, FLEX_ALIGN.indexOf(String(s).toLowerCase())));
    p.setLayout(n, {
      type: v.type == null ? l.type : (v.type === 'flex' || v.type === 1 ? 1 : 0),
      flow: v.flow == null ? l.flow : (v.flow === 'column' || v.flow === 1 ? 1 : 0),
      wrap: v.wrap ?? l.wrap, reversed: v.reverse ?? v.reversed ?? l.reversed,
      main: idx(v.main, l.main), cross: idx(v.cross, l.cross), track: idx(v.track, l.track),
    });
  }
  applyStyles(n, styles) {
    const p = this.p;
    for (const s of styles || []) {
      const part = (s.part || 'main').toLowerCase();
      if (!p.styleProp(n, part)) throw new Error(`${p.name(n)}: no style part '${part}'. Available: ${p.styleProps(n).map((x) => x.strtype.split('/')[1].replace(/^Style_/, '').toLowerCase()).join(', ')}`);
      let v = s.value;
      if (typeof v === 'string' && /^#?[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v) && /color/i.test(s.name)) {
        const h = v.replace('#', '');
        v = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)).concat(h.length === 8 ? parseInt(h.substr(6, 2), 16) : 255);
      }
      if (Array.isArray(v) && /color/i.test(s.name) && v.length === 3) v = [...v, 255];
      p.setStyle(n, part, s.name, v === null ? undefined : v, s.state || 'DEFAULT');
      if (s.name === 'Bg_Image' && v) p.style(n, part, 'Bg_Image', s.state || 'DEFAULT').InheritedType = 5;
    }
  }
  applyAll(n, a) {
    if (a.name) { const nm = String(a.name).trim(); if (!/^[A-Za-z]/.test(nm)) throw new Error('Names must start with a letter'); this.p.setName(n, nm); }
    this.applyTransform(n, a);
    if (a.text != null) this.applyText(n, a.text);
    if (a.asset != null) this.p.setStr(n, 'Asset', a.asset, 5);
    if (a.hidden != null) this.p.setBool(n, 'Hidden', a.hidden);
    if (a.locked != null) n.locked = !!a.locked;
    this.applyProps(n, a.props);
    this.applyStyles(n, a.styles);
  }
  /** Run a mutation; on error roll back to the last committed state. */
  mutate(label, fn) {
    const app = this.app, wasDirty = app.dirty;
    try {
      const r = fn();
      app.commit('AI: ' + label);
      return r;
    } catch (e) {
      app.restore(app.history.current);
      app.setDirty(wasDirty);
      throw e;
    }
  }

  // ---------------------------------------------------------------- handlers
  handlers() {
    const app = this.app;
    return {
      get_state: () => {
        const p = this.p;
        if (!p) return { connected: true, project: null, hint: 'Load the Alite2 UI project with reload_project.' };
        const info = p.info;
        return {
          connected: true,
          project: {
            file: p.fileName, width: p.width, height: p.height,
            lvgl_version: info.lvgl_version, theme: info.theme_dark !== false ? 'dark' : 'light', primary_color: PALETTE_NAMES[info.theme_color1 ?? 5],
            shape: info.shape, unsaved: app.dirty,
          },
          screens: p.screens().map((s) => ({ name: p.name(s), guid: s.guid, widgets: countDesc(s) - 1, locked: !!s.locked })),
          current_screen: p.name(p.get(app.currentScreen)),
          selection: app.selNodes().map((n) => p.name(n)),
          history: app.history.entries().slice(-8).map((e) => (e.idx === 0 ? '▶ ' : '') + e.label),
          widget_types: Object.keys(TYPE_LABEL),
        };
      },
      open_project: async ({ text, fileName, path, assets, discard_changes }) => {
        if (app.dirty && !discard_changes) throw new Error('The editor has unsaved changes. Save first or call again with discard_changes=true.');
        const project = Project.fromText(text, fileName);
        app.dirty = false;
        app.assets.clear();
        for (const a of assets || []) {
          const bin = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
          app.assets.add(a.path, new File([bin], a.path.split('/').pop(), { type: a.mime }));
        }
        await app.loadProject(project, { serverPath: path });
        return { opened: path, screens: project.screens().map((s) => project.name(s)), assets: (assets || []).length };
      },
      get_tree: ({ screen }) => {
        const s = screen ? this.resolve(screen) : this.p.get(app.currentScreen);
        if (!s || s.saved_objtypeKey !== 'SCREEN') throw new Error('Screen not found');
        if (!app.canvas.frames.has(s.guid)) { app.select([s.guid]); }
        return { resolution: [this.p.width, this.p.height], screen: this.describe(s, true) };
      },
      get_widget: ({ id }) => {
        const n = this.resolve(id), p = this.p;
        const props = {};
        for (const q of n.properties || []) {
          if ([1, 11].includes(q.InheritedType) || q.strtype.startsWith('_event')) continue;
          const k = q.strtype.split('/')[1];
          props[k] = q.intarray ?? q.integer ?? (q.InheritedType === 2 ? q.strval === 'True' : q.InheritedType === 6 ? 0 : ESCAPED.has(k) ? unescapeText(q.strval) : q.strval);
        }
        const styles = {};
        for (const sp of p.styleProps(n)) {
          const part = sp.strtype.split('/')[1].replace(/^Style_/, '').toLowerCase();
          styles[part] = {};
          for (const st of sp.childs || []) {
            styles[part][st.strval] = Object.fromEntries((st.childs || []).map((c) => [c.strtype.replace('_style/', ''), c.intarray ?? c.integer ?? c.strval ?? 0]));
          }
        }
        const events = p.events(n).map((e) => ({ trigger: e.strval, name: e.childs?.find((c) => c.strtype === '_event/name')?.strval, actions: (e.childs || []).filter((c) => c.strtype === '_event/action').map((c) => c.strval) }));
        const par = p.parent(n);
        return { ...this.describe(n), parent: par && par !== p.root ? p.name(par) : null, children: (n.children || []).map((c) => p.name(c)), props, styles, events };
      },
      add_widget: (a) => {
        let created;
        const parent = a.parent ? this.resolve(a.parent) : null;
        if (a.type === 'TABPAGE' && parent?.saved_objtypeKey !== 'TABVIEW') throw new Error('The parent of a TABPAGE must be a TABVIEW');
        const before = app.history.past.length, wasDirty = app.dirty;
        try {
          created = app.addWidget(a.type, parent, { configure: (n) => this.applyAll(n, a), label: 'AI: ' });
        } catch (e) {
          if (app.history.past.length === before) { app.restore(app.history.current); app.setDirty(wasDirty); }
          throw e;
        }
        if (!created) throw new Error(`Could not add ${a.type}`);
        return this.describe(created);
      },
      update_widget: (a) => {
        const n = this.resolve(a.id);
        if (this.p.isLocked(n) && a.locked !== false) throw new Error(`${this.p.name(n)} is locked. Send locked:false as well to unlock and change it.`);
        this.mutate(`Edit ${this.p.name(n)}`, () => this.applyAll(n, a));
        return this.describe(n);
      },
      delete_widgets: ({ ids }) => {
        const nodes = this.refsToNodes(ids);
        const locked = nodes.filter((n) => this.p.isLocked(n)).map((n) => this.p.name(n));
        if (locked.length) throw new Error(`Locked items cannot be deleted: ${locked.join(', ')}`);
        const names = nodes.map((n) => this.p.name(n));
        app.deleteNodes(nodes);
        return { deleted: names };
      },
      duplicate_widgets: ({ ids }) => {
        app.duplicate(this.refsToNodes(ids));
        return { created: app.selNodes().map((n) => this.describe(n)) };
      },
      reparent_widget: ({ id, parent, index }) => {
        const n = this.resolve(id), par = this.resolve(parent);
        if (n === par || this.p.isAncestor(n, par)) throw new Error('Cannot move a widget into itself or its children');
        app.moveNodes([n.guid], par, index ?? par.children.length, `AI: ${this.p.name(n)} → ${this.p.name(par)}`);
        return this.describe(n);
      },
      arrange: ({ ids, action }) => {
        const nodes = this.refsToNodes(ids);
        app.select(nodes.map((n) => n.guid));
        const map = {
          align_left: () => app.alignSel('left'), align_center: () => app.alignSel('centerH'), align_right: () => app.alignSel('right'),
          align_top: () => app.alignSel('top'), align_middle: () => app.alignSel('middle'), align_bottom: () => app.alignSel('bottom'),
          distribute_horizontal: () => app.distribute('h'), distribute_vertical: () => app.distribute('v'),
          same_width: () => app.sameSize('w'), same_height: () => app.sameSize('h'),
          bring_to_front: () => app.zorder('front'), send_to_back: () => app.zorder('back'), bring_forward: () => app.zorder('forward'), send_backward: () => app.zorder('backward'),
        };
        if (!map[action]) throw new Error('Unknown action: ' + action);
        if (action.startsWith('distribute') && nodes.length < 3) throw new Error('distribute needs 3 or more widgets');
        if (action.startsWith('same') && nodes.length < 2) throw new Error('same_width/height needs 2 or more widgets');
        map[action]();
        return { result: nodes.map((n) => this.describe(n)) };
      },
      add_screen: ({ name }) => {
        const s = app.addWidget('SCREEN', null, { configure: (n) => { if (name) this.applyAll(n, { name }); } });
        app.canvas.fitScreen(s.guid);
        return this.describe(s);
      },
      select: ({ ids, focus }) => {
        const nodes = this.refsToNodes(ids);
        app.select(nodes.map((n) => n.guid), { reveal: true });
        if (focus) app.canvas.fitScreen();
        return { selected: nodes.map((n) => this.p.name(n)) };
      },
      undo: ({ steps = 1 }) => { const out = []; for (let i = 0; i < steps && app.history.canUndo(); i++) { out.push(app.history.currentLabel); app.undo(); } return { undone: out }; },
      redo: ({ steps = 1 }) => { const out = []; for (let i = 0; i < steps && app.history.canRedo(); i++) { app.redo(); out.push(app.history.currentLabel); } return { redone: out }; },
      list_assets: () => app.assets.list().map((a) => ({ path: a.path, width: a.w, height: a.h })),
      serialize: () => {
        if (!this.p) throw new Error('No project loaded');
        this.p.data.selected_screen = app.currentScreen;
        return { text: this.p.serialize(), fileName: this.p.fileName };
      },
      load_asset: ({ path, base64 }) => {
        const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        app.assets.add(path, new File([bin], path.split('/').pop(), { type: 'image/png' }));
        return { loaded: path };
      },
      mark_saved: () => { app.setDirty(false); app.toast('Project saved by the AI assistant', 'ok'); },
    };
  }
}

function countDesc(n) { let c = 1; for (const k of n.children || []) c += countDesc(k); return c; }
