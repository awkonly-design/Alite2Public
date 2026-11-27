// UI project model (alite2_ui.json): parsing, property access, mutation, serialization.
import { TEMPLATES } from './templates.js';

export const UNIT = { PX: 1, PCT: 2, CONTENT: 3 };
export const UNIT_NAME = { 1: 'px', 2: '%', 3: 'content' };
export const ALIGNS = ['TOP_LEFT', 'TOP_MID', 'TOP_RIGHT', 'LEFT_MID', 'CENTER', 'RIGHT_MID', 'BOTTOM_LEFT', 'BOTTOM_MID', 'BOTTOM_RIGHT'];

// Canonical nids used for template properties.
const PROP_NID = {
  Name: 10, Layout: 20, Layout_type: 30, Transform: 40, Position: 50, Size: 60, Align: 70,
  Extend_click_area: 75, Flags: 90, Hidden: 100, Clickable: 110, Adv_hittest: 150, Scrolling: 225,
  Scrollable: 230, Scrollbar_mode: 300, Scroll_direction: 310, Scroll_snap_x: 314, Scroll_snap_y: 315,
  States: 320, Checked: 330,
};
export const STYLE_NID = {
  Arc_Color: 10310, Arc_Width: 10320, Text_Color: 10410, Text_Align: 10430, Text_Font: 10450,
  Bg_Radius: 10510, Bg_Color: 10520, Bg_Image: 10610, Border_Color: 10710, Padding: 11110,
};
// Container-like widget types that may get children when adding from the palette.
export const CONTAINER_TYPES = new Set(['SCREEN', 'PANEL', 'CONTAINER', 'BUTTON', 'TABPAGE', 'IMAGE', 'IMGBUTTON']);

let _uid = Date.now() % 1000000;
export function newGuid() {
  const r = () => Math.floor(Math.random() * 99999999);
  return `GUID${r()}-${(_uid++ % 999999)}S${r()}`;
}
const randNid = () => (Math.floor(Math.random() * 0xffffffff) | 0);

/** Convert stored escaped text (literal "\n") to display text and back. */
export const unescapeText = (s) => (s ?? '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
export const escapeText = (s) => (s ?? '').replace(/\n/g, '\\n').replace(/\t/g, '\\t');

/** Make sure node.children is a real (serialized) array before adding children. */
function ensureKids(n) {
  const d = Object.getOwnPropertyDescriptor(n, 'children');
  if (!d || !d.enumerable) Object.defineProperty(n, 'children', { value: n.children || [], writable: true, configurable: true, enumerable: true });
  return n.children;
}

const propKey = (p) => { const i = p.strtype.indexOf('/'); return i < 0 ? p.strtype : p.strtype.slice(i + 1); };

export class Project {
  constructor(data, fileName = 'alite2_ui.json') {
    if (!data || !data.root || !Array.isArray(data.root.children)) throw new Error('Not a UI project file.');
    this.data = data;
    this.fileName = fileName;
    this.reindex();
  }

  static fromText(text, fileName) { return new Project(JSON.parse(text), fileName); }

  reindex() {
    this.byGuid = new Map();
    this.parentOf = new Map();
    const walk = (n, parent) => {
      if (!n.guid) n.guid = newGuid();
      this.byGuid.set(n.guid, n);
      if (parent) this.parentOf.set(n.guid, parent);
      // leaf nodes often have no "children" key; add a hidden one so it isn't serialized
      if (!n.children) Object.defineProperty(n, 'children', { value: [], writable: true, configurable: true, enumerable: false });
      n.children.forEach((c) => walk(c, n));
    };
    walk(this.data.root, null);
  }

  get info() { return this.data.info || (this.data.info = {}); }
  get width() { return this.info.width || 480; }
  get height() { return this.info.height || 320; }
  get root() { return this.data.root; }
  screens() { return this.root.children.filter((n) => n.saved_objtypeKey === 'SCREEN'); }
  get(guid) { return this.byGuid.get(guid); }
  parent(node) { return node && this.parentOf.get(node.guid); }
  type(node) { return node?.saved_objtypeKey; }
  screenOf(node) {
    let n = node;
    while (n && n.saved_objtypeKey !== 'SCREEN') n = this.parent(n);
    return n;
  }
  ancestors(node) { const out = []; let p = this.parent(node); while (p) { out.push(p); p = this.parent(p); } return out; }
  isAncestor(a, b) { return this.ancestors(b).includes(a); }
  walk(node, fn, depth = 0) { fn(node, depth); for (const c of node.children || []) this.walk(c, fn, depth + 1); }

  // ---------- properties ----------
  prop(node, key) {
    const props = node?.properties;
    if (!props) return undefined;
    const t = node.saved_objtypeKey;
    let found;
    for (const p of props) {
      if (propKey(p) !== key) continue;
      if (p.strtype.startsWith(t + '/')) return p; // type-specific has priority
      found ||= p;
    }
    return found;
  }
  str(node, key, def = '') { const p = this.prop(node, key); return p && p.strval != null ? p.strval : def; }
  bool(node, key, def = false) { const p = this.prop(node, key); return p && p.strval != null ? p.strval === 'True' : def; }
  int(node, key, def = 0) { const p = this.prop(node, key); return p && p.integer != null ? p.integer : (p ? 0 : def); }
  arr(node, key, def = null) { const p = this.prop(node, key); return p && Array.isArray(p.intarray) ? p.intarray : def; }

  ensureProp(node, key, init) {
    let p = this.prop(node, key);
    if (p) return p;
    // TABPAGE keeps everything under its own prefix; other widgets use TYPE/Hidden and OBJECT/* for common props.
    const t = node.saved_objtypeKey;
    const prefix = t === 'TABPAGE' || key === 'Hidden' ? t : 'OBJECT';
    p = { nid: PROP_NID[key] ?? randNid(), strtype: `${prefix}/${key}`, ...init };
    const props = (node.properties ||= []);
    // keep transform props together, before widget-specific/style/events
    const order = ['Name', 'Layout', 'Layout_type', 'Transform', 'Position', 'Size', 'Align'];
    let idx = props.length;
    const oi = order.indexOf(key);
    if (oi >= 0) {
      idx = props.findIndex((q) => { const k = order.indexOf(propKey(q)); return k < 0 || k > oi; });
      if (idx < 0) idx = props.length;
    } else {
      const s = props.findIndex((q) => q.InheritedType === 11 || q.strtype.startsWith('_event/'));
      if (s >= 0) idx = s;
    }
    props.splice(idx, 0, p);
    return p;
  }
  setStr(node, key, v, it = 10) { this.ensureProp(node, key, { strval: v, InheritedType: it }).strval = v; }
  setBool(node, key, v) { this.ensureProp(node, key, { strval: 'False', InheritedType: 2 }).strval = v ? 'True' : 'False'; }
  setInt(node, key, v) { this.ensureProp(node, key, { InheritedType: 6 }).integer = v | 0; }
  setArr(node, key, arr, flags) {
    const p = this.ensureProp(node, key, { intarray: arr.slice(), InheritedType: 7 });
    p.intarray = arr.map((v) => Math.round(v));
    if (flags != null) p.flags = flags;
  }

  name(node) {
    if (!node) return '';
    if (node.saved_objtypeKey === 'STARTEVENTS') return 'Initial actions';
    return this.str(node, 'Name', node.saved_objtypeKey);
  }
  setName(node, v) { this.setStr(node, 'Name', v); }

  // ---------- transform ----------
  pos(node) {
    const p = this.prop(node, 'Position');
    if (!p) return { x: 0, y: 0, ux: UNIT.PX, uy: UNIT.PX, missing: true };
    const f = p.flags ?? 17;
    return { x: p.intarray?.[0] ?? 0, y: p.intarray?.[1] ?? 0, ux: (f & 0xf) || 1, uy: ((f >> 4) & 0xf) || 1 };
  }
  setPos(node, x, y, ux, uy) {
    const cur = this.pos(node);
    ux ??= cur.ux; uy ??= cur.uy;
    const old = this.prop(node, 'Position');
    const flags = ((old?.flags ?? 0) & ~0xff) | (ux & 0xf) | ((uy & 0xf) << 4);
    this.setArr(node, 'Position', [x, y], flags);
  }
  size(node) {
    const p = this.prop(node, 'Size');
    if (!p) return { w: 100, h: 100, uw: UNIT.PCT, uh: UNIT.PCT, missing: true };
    const f = p.flags ?? 17;
    return { w: p.intarray?.[0] ?? 0, h: p.intarray?.[1] ?? 0, uw: (f & 0xf) || 1, uh: ((f >> 4) & 0xf) || 1 };
  }
  setSize(node, w, h, uw, uh) {
    const cur = this.size(node);
    uw ??= cur.uw; uh ??= cur.uh;
    const old = this.prop(node, 'Size');
    const flags = ((old?.flags ?? 0) & ~0xff) | (uw & 0xf) | ((uh & 0xf) << 4);
    this.setArr(node, 'Size', [Math.max(uw === UNIT.CONTENT ? 1 : 0, w), Math.max(uh === UNIT.CONTENT ? 1 : 0, h)], flags);
  }
  align(node) { const p = this.prop(node, 'Align'); return p?.strval || (this.prop(node, 'Position') ? 'CENTER' : 'TOP_LEFT'); }
  setAlign(node, v) { this.setStr(node, 'Align', v, 3); }

  layout(node) {
    const p = this.prop(node, 'Layout_type');
    if (!p) return { type: 0, flow: 0, wrap: false, reversed: false, main: 0, cross: 0, track: 0 };
    return { type: p.LayoutType || (p.strval === 'Flex' ? 1 : 0), flow: p.Flow || 0, wrap: !!p.Wrap, reversed: !!p.Reversed, main: p.MainAlignment || 0, cross: p.CrossAlignment || 0, track: p.TrackAlignment || 0, p };
  }
  setLayout(node, l) {
    const p = this.ensureProp(node, 'Layout_type', { Flow: 0, Wrap: false, Reversed: false, MainAlignment: 0, CrossAlignment: 0, TrackAlignment: 0, LayoutType: 0, strval: 'No_layout', InheritedType: 13 });
    p.LayoutType = l.type; p.strval = l.type === 1 ? 'Flex' : 'No_layout';
    p.Flow = l.flow; p.Wrap = !!l.wrap; p.Reversed = !!l.reversed;
    p.MainAlignment = l.main; p.CrossAlignment = l.cross; p.TrackAlignment = l.track;
  }
  isHidden(node) { return this.bool(node, 'Hidden'); }
  isLocked(node) { return !!node.locked; }
  inFlex(node) {
    const par = this.parent(node);
    if (!par || this.layout(par).type !== 1) return false;
    return !this.bool(node, 'Ignore_layout') && !this.bool(node, 'Floating');
  }

  // ---------- styles ----------
  styleProps(node) { return (node.properties || []).filter((p) => p.InheritedType === 11); }
  /** part key: 'main', 'indicator', 'knob', ... (from strtype TYPE/Style_<part>) */
  styleProp(node, part = 'main') {
    return this.styleProps(node).find((p) => propKey(p).toLowerCase() === 'style_' + part.toLowerCase());
  }
  style(node, part, name, state = 'DEFAULT') {
    const sp = this.styleProp(node, part);
    const st = sp?.childs?.find((s) => s.strval === state);
    return st?.childs?.find((c) => c.strtype === '_style/' + name);
  }
  setStyle(node, part, name, value, state = 'DEFAULT') {
    const sp = this.styleProp(node, part);
    if (!sp) return;
    sp.childs ||= [];
    let st = sp.childs.find((s) => s.strval === state);
    if (!st) { st = { nid: 10000, strtype: '_style/StyleState', strval: state, childs: [], InheritedType: 1 }; sp.childs.push(st); }
    st.childs ||= [];
    let c = st.childs.find((x) => x.strtype === '_style/' + name);
    if (value === undefined) { if (c) st.childs.splice(st.childs.indexOf(c), 1); if (!st.childs.length) sp.childs.splice(sp.childs.indexOf(st), 1); return; }
    if (!c) { c = { nid: STYLE_NID[name] ?? randNid(), strtype: '_style/' + name }; st.childs.push(c); }
    if (Array.isArray(value)) { c.intarray = value; c.InheritedType = 7; }
    else if (typeof value === 'number') { c.integer = value; c.InheritedType = 6; }
    else { c.strval = value; c.InheritedType = 3; }
  }

  events(node) { return (node.properties || []).filter((p) => p.strtype === '_event/EventHandler'); }

  // ---------- structure ----------
  uniqueName(base, reserved) {
    const names = new Set(reserved || []);
    this.walk(this.root, (n) => names.add(this.name(n)));
    const m = base.match(/^(.*?)(\d+)$/);
    const stem = m ? m[1] : base;
    let i = m ? +m[2] : 1;
    let cand = m ? base : stem + i;
    while (names.has(cand)) cand = stem + (++i);
    reserved?.add(cand);
    return cand;
  }

  createNode(type, opts = {}) {
    const tpl = TEMPLATES[type];
    if (!tpl) throw new Error(`No template for widget type: ${type}`);
    const node = JSON.parse(JSON.stringify(tpl));
    node.guid = newGuid();
    node.deepid = randNid();
    node.children = [];
    const base = { SCREEN: 'Screen', TABPAGE: 'TabPage', IMAGE: 'Image', TEXTAREA: 'TextArea', IMGBUTTON: 'ImgButton' }[type] || (type[0] + type.slice(1).toLowerCase());
    this.setName(node, this.uniqueName(base + '1'));
    if (opts.size && this.prop(node, 'Size')) this.setSize(node, ...opts.size);
    if (opts.pos && this.prop(node, 'Position')) this.setPos(node, ...opts.pos);
    if (opts.align) this.setAlign(node, opts.align);
    return node;
  }

  insert(node, parent, index = parent.children.length) {
    ensureKids(parent);
    parent.children.splice(Math.max(0, Math.min(index, parent.children.length)), 0, node);
    this.reindex();
  }
  remove(node) {
    const par = this.parent(node);
    if (!par) return;
    par.children.splice(par.children.indexOf(node), 1);
    this.reindex();
  }
  move(node, newParent, index) {
    const par = this.parent(node);
    if (!par || node === newParent || this.isAncestor(node, newParent)) return false;
    const oldIdx = par.children.indexOf(node);
    par.children.splice(oldIdx, 1);
    ensureKids(newParent);
    if (par === newParent && index > oldIdx) index--;
    newParent.children.splice(Math.max(0, Math.min(index, newParent.children.length)), 0, node);
    this.reindex();
    return true;
  }
  clone(node, rename = true) {
    const c = JSON.parse(JSON.stringify(node));
    const reserved = new Set();
    const renew = (n) => {
      n.guid = newGuid();
      if (n.deepid != null) n.deepid = randNid();
      if (rename && this.prop(n, 'Name')) this.setName(n, this.uniqueName(this.name(n), reserved));
      (n.children || []).forEach(renew);
    };
    // rename against the current project + already renamed nodes
    renew(c);
    return c;
  }

  addScreen(index) {
    const scr = this.createNode('SCREEN');
    const screens = this.screens();
    const last = screens[screens.length - 1];
    scr.isPage = true;
    scr.editor_posx = last ? (last.editor_posx || 0) + this.width + 80 : 0;
    scr.editor_posy = last ? (last.editor_posy || 0) : 0;
    const idx = index ?? this.root.children.length;
    this.insert(scr, this.root, idx);
    return scr;
  }

  serialize() { return JSON.stringify(this.data, null, 2); }
}
