// Renders the UI widgets as DOM, approximating the LVGL 8 default theme.
import { UNIT, unescapeText } from './project.js';

const PALETTE = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B', '#9E9E9E'];
export const PALETTE_NAMES = ['Red', 'Pink', 'Purple', 'Deep purple', 'Indigo', 'Blue', 'Light blue', 'Cyan', 'Teal', 'Green',
  'Light green', 'Lime', 'Yellow', 'Amber', 'Orange', 'Deep orange', 'Brown', 'Blue grey', 'Grey'];
export { PALETTE };

// LVGL symbol code points (FontAwesome) used by built-in widgets.
const SYM = { down: '', ok: '', bksp: '', kb: '', left: '', right: '', nl: '' };

export function makeTheme(info) {
  const dark = info.theme_dark !== false;
  const primary = PALETTE[info.theme_color1 ?? 5] || PALETTE[5];
  const secondary = PALETTE[info.theme_color2 ?? 0] || PALETTE[0];
  return {
    dark, primary, secondary,
    scr: dark ? '#15171A' : '#F5F5F5',
    card: dark ? '#282B30' : '#FFFFFF',
    grey: dark ? '#2F3237' : '#EEEEEE',
    border: dark ? '#2F3237' : '#E0E0E0',
    text: dark ? '#FFFFFF' : '#212121',
    muted: dark ? '#9E9E9E' : '#757575',
    primaryMuted: mix(primary, dark ? '#000000' : '#FFFFFF', dark ? 0.6 : 0.7),
    pad: (info.width || 480) <= 320 ? 13 : (info.width || 480) <= 720 ? 16 : 20,
    padSmall: 8, radius: 10, gap: 10,
  };
}

export function mix(a, b, t) {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  const c = pa.map((v, i) => Math.round(v * (1 - t) + pb[i] * t));
  return rgbToHex(c);
}
export function hexToRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); }
export function rgbToHex(c) { return '#' + c.slice(0, 3).map((v) => (v | 0).toString(16).padStart(2, '0')).join('').toUpperCase(); }
const rgba = (arr, opaMul = 1) => `rgba(${arr[0]},${arr[1]},${arr[2]},${((arr[3] ?? 255) / 255) * opaMul})`;

export function fontInfo(name) {
  if (!name) return { size: 14, family: 'Montserrat' };
  const m = String(name).match(/(\d+)\s*$/);
  const size = m ? Math.min(+m[1], 200) : 14;
  const family = /unscii/i.test(name) ? 'monospace' : /dejavu/i.test(name) ? 'DejaVu Sans, Verdana' : 'Montserrat';
  return { size, family };
}
export const lineHeight = (size) => Math.round(size * 1.15) + 1;

/** Anchor offset of a child inside the parent content area for an LVGL align. */
export function anchor(align, cw, ch, w, h) {
  const half = (v) => Math.trunc(v / 2);
  const mx = half(cw) - half(w), my = half(ch) - half(h);
  const T = {
    TOP_LEFT: [0, 0], TOP_MID: [mx, 0], TOP_RIGHT: [cw - w, 0],
    LEFT_MID: [0, my], CENTER: [mx, my], RIGHT_MID: [cw - w, my],
    BOTTOM_LEFT: [0, ch - h], BOTTOM_MID: [mx, ch - h], BOTTOM_RIGHT: [cw - w, ch - h],
  };
  const [ax, ay] = T[align] || [0, 0];
  return { ax, ay };
}

const norm = (s) => s.toLowerCase().replace(/[\s_]/g, '');

export class Renderer {
  constructor(project, assets, view) {
    this.p = project; this.assets = assets; this.view = view; // view: { activeTab: Map, revealGuids: Set }
    this.theme = makeTheme(project.info);
  }

  /** Collect resolved style of a part: {key(normalized): styleChild} merged over states. */
  partStyle(node, part) {
    const sp = this.p.styleProp(node, part);
    const out = {};
    if (!sp?.childs) return out;
    const checked = this.p.bool(node, 'Checked');
    for (const st of sp.childs) {
      if (st.strval !== 'DEFAULT' && !(checked && st.strval === 'CHECKED')) continue;
      for (const c of st.childs || []) out[norm(c.strtype.replace('_style/', ''))] = c;
    }
    return out;
  }

  /** Render a screen. `mount(el)` must attach el to the document so text can be measured. */
  renderScreen(screen, mount) {
    const el = document.createElement('div');
    el.className = 'lv-screen';
    el.dataset.guid = screen.guid;
    const W = this.p.width, H = this.p.height;
    el.style.width = W + 'px'; el.style.height = H + 'px';
    if (this.p.info.shape === 'CIRCLE') el.style.borderRadius = '50%';
    this.meta = new Map();
    const s = this.partStyle(screen, 'main');
    el.style.background = this.theme.scr;
    el.style.color = this.theme.text;
    this.applyBox(el, s, { pad: 0 });
    this.applyText(el, s);
    const ctx = this.ctxFor(screen, el, W, H, s, 0);
    this.meta.set(screen.guid, { el, ...ctx });
    mount?.(el);
    if (ctx.flex) this.applyFlex(el, ctx.layout, s);
    for (const c of screen.children) this.renderNode(c, el, ctx);
    return el;
  }

  ctxFor(node, el, w, h, s, defPad, border = 0) {
    const pad = this.padding(s, defPad);
    const l = this.p.layout(node);
    return { cw: Math.max(0, w - pad[0] - pad[1] - 2 * border), ch: Math.max(0, h - pad[2] - pad[3] - 2 * border), padL: pad[0], padT: pad[2], border, flex: l.type === 1, layout: l };
  }

  padding(s, def) {
    const p = s.padding?.intarray;
    if (p) return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 0];
    if (Array.isArray(def)) return def;
    return [def, def, def, def];
  }

  /** Theme defaults per widget type for the main part. */
  defaults(type) {
    const t = this.theme;
    const card = { bg: t.card, border: 2, borderColor: t.border, radius: t.radius, pad: t.pad };
    switch (type) {
      case 'PANEL': return card;
      case 'CONTAINER': return { pad: 0 };
      case 'BUTTON': return { bg: t.primary, radius: t.radius, pad: [t.pad, t.pad, t.padSmall, t.padSmall], color: '#FFFFFF', shadow: true };
      case 'IMGBUTTON': return { pad: 0 };
      case 'TEXTAREA': return { ...card, pad: t.pad - 4 };
      case 'SPINBOX': return { ...card, pad: t.padSmall };
      case 'DROPDOWN': return { ...card, pad: [t.padSmall + 4, t.padSmall + 4, t.padSmall, t.padSmall] };
      case 'ROLLER': return { ...card, pad: [t.padSmall, t.padSmall, 0, 0] };
      case 'CALENDAR': case 'CHART': return card;
      case 'KEYBOARD': return { bg: t.dark ? '#2F3237' : '#E0E0E0', pad: 4 };
      case 'TABVIEW': return { bg: t.scr, pad: 0 };
      case 'TABPAGE': return { pad: t.pad };
      case 'SWITCH': return { bg: t.dark ? '#3E4248' : '#E0E0E0', radius: 999, pad: 0 };
      case 'SLIDER': case 'BAR': return { bg: t.primaryMuted, radius: 999, pad: 0 };
      case 'CHECKBOX': return { pad: 0 };
      default: return { pad: 0 };
    }
  }

  applyBox(el, s, d = {}) {
    // background
    const bgc = s.bgcolor?.intarray;
    if (bgc) el.style.background = rgba(bgc);
    else if (d.bg) el.style.background = d.bg;
    const gc = s.bggradientcolor?.intarray || s.bggradcolor?.intarray;
    const gd = (s.bggradientdirection || s.bggraddir)?.strval;
    if (gc && gd && gd !== 'NONE') {
      const from = bgc ? rgba(bgc) : d.bg || 'transparent';
      el.style.background = `linear-gradient(${gd === 'HOR' ? 'to right' : 'to bottom'}, ${from}, ${rgba(gc)})`;
    }
    const img = s.bgimage?.strval;
    if (img) {
      const url = this.assets.url(img);
      if (url) { el.style.backgroundImage = `url("${url}")`; el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundPosition = 'center'; }
    }
    // radius
    const r = s.bgradius ? (s.bgradius.integer ?? 0) : d.radius;
    if (r != null) el.style.borderRadius = (r >= 0x7fff ? 9999 : r) + 'px';
    // border
    const bw = (s.borderwidth ? s.borderwidth.integer ?? 0 : d.border) || 0;
    const bc = s.bordercolor?.intarray;
    if (bw) {
      el.style.borderStyle = 'solid';
      el.style.borderWidth = bw + 'px';
      el.style.borderColor = bc ? rgba(bc) : d.borderColor || this.theme.border;
      const side = s.borderside?.strval;
      if (side && side !== 'FULL' && side !== 'DEFAULT') {
        const sides = side.split(/[|,\s]+/).map((x) => x.toLowerCase());
        for (const k of ['top', 'bottom', 'left', 'right']) if (!sides.includes(k)) el.style['border' + k[0].toUpperCase() + k.slice(1) + 'Width'] = '0';
      }
    }
    // outline [width, pad]
    const oc = s.outlinecolor?.intarray, op = s.outlineparams?.intarray;
    if (oc && op && op[0]) { el.style.outline = `${op[0]}px solid ${rgba(oc)}`; el.style.outlineOffset = (op[1] || 0) + 'px'; }
    // shadow
    const sc = s.shadowcolor?.intarray, spp = s.shadowparams?.intarray;
    if (sc && spp) el.style.boxShadow = `${spp[2] || 0}px ${spp[3] || 0}px ${spp[0] || 0}px ${spp[1] || 0}px ${rgba(sc)}`;
    else if (d.shadow && !bgc) el.style.boxShadow = `0 3px 3px ${this.theme.dark ? 'rgba(0,0,0,.5)' : 'rgba(158,158,158,.6)'}`;
    // padding
    const pad = this.padding(s, d.pad ?? 0);
    el.style.padding = `${pad[2]}px ${pad[1]}px ${pad[3]}px ${pad[0]}px`;
    // opacity
    const o = s.opacity || s.opa;
    if (o && o.integer != null) el.style.opacity = String(o.integer / 255);
    if (d.color) el.style.color = d.color;
    return { pad, border: bw };
  }

  applyText(el, s) {
    const tc = s.textcolor?.intarray;
    if (tc) el.style.color = rgba(tc);
    const f = s.textfont?.strval;
    if (f) { const fi = fontInfo(f); el.style.fontSize = fi.size + 'px'; el.style.fontFamily = `${fi.family}, 'Font Awesome 5 Free', sans-serif`; el.style.lineHeight = lineHeight(fi.size) + 'px'; }
    const ta = s.textalign?.strval;
    if (ta && ta !== 'AUTO') el.style.textAlign = ta.toLowerCase();
    const ls = s.textletterspace || s.textletterspacing;
    if (ls?.integer) el.style.letterSpacing = ls.integer + 'px';
    const ln = s.textlinespace || s.textlinespacing;
    if (ln?.integer) { const fs = parseFloat(el.style.fontSize) || 14; el.style.lineHeight = lineHeight(fs) + ln.integer + 'px'; }
    const dec = s.textdecor?.strval;
    if (dec && dec !== 'NONE') el.style.textDecoration = dec.toLowerCase().replace('strikethrough', 'line-through');
  }

  renderNode(node, parentEl, pctx) {
    const p = this.p, type = node.saved_objtypeKey;
    const el = document.createElement('div');
    el.className = 'lv-obj lv-' + type.toLowerCase();
    el.dataset.guid = node.guid;
    const s = this.partStyle(node, 'main');
    const d = this.defaults(type);
    const box = this.applyBox(el, s, d);
    this.applyText(el, s);
    if (!p.bool(node, 'Overflow_visible')) el.style.overflow = 'hidden';

    const hidden = p.isHidden(node);
    if (hidden) {
      if (this.view.revealGuids?.has(node.guid)) el.classList.add('lv-hidden-reveal');
      else el.style.display = 'none';
    }

    // size
    const flexChild = pctx.flex && p.inFlex(node);
    let { w, h, uw, uh } = p.size(node);
    if (type === 'TABPAGE') { w = 100; h = 100; uw = uh = UNIT.PCT; }
    const rw = uw === UNIT.PX ? w : uw === UNIT.PCT ? Math.trunc(pctx.cw * w / 100) : null;
    const rh = uh === UNIT.PX ? h : uh === UNIT.PCT ? Math.trunc(pctx.ch * h / 100) : null;
    el.style.position = flexChild ? 'relative' : 'absolute';
    if (flexChild) el.style.flex = '0 0 auto';
    if (rw != null) el.style.width = rw + 'px';
    if (rh != null) el.style.height = rh + 'px';
    if (rw == null) el.style.width = 'max-content';
    parentEl.appendChild(el);

    // content-defining inner parts
    this.buildContent(node, el, s, rw, rh);

    // children
    const tmpW = rw ?? el.offsetWidth, tmpH = rh ?? el.offsetHeight;
    let ctx = this.ctxFor(node, el, tmpW, tmpH, s, d.pad ?? 0, box.border);
    let childHost = el;
    if (type === 'TABVIEW') { childHost = el.querySelector('.lv-tab-content'); ctx = { cw: childHost.offsetWidth, ch: childHost.offsetHeight, padL: 0, padT: 0, border: 0, flex: false, layout: {} }; }
    if (ctx.flex) this.applyFlex(el, ctx.layout, s);
    const kids = type === 'TABVIEW' ? node.children.filter((c, i) => i === this.activeTab(node)) : node.children;
    for (const c of kids) this.renderNode(c, childHost, ctx);

    // content size from children for non-text containers
    if ((rw == null || rh == null) && node.children.length && !['LABEL', 'CHECKBOX', 'DROPDOWN', 'ROLLER', 'TEXTAREA', 'SPINBOX'].includes(type) && !ctx.flex) {
      let mx = 0, my = 0;
      for (const ch of el.children) {
        if (!ch.dataset.guid) continue;
        mx = Math.max(mx, ch.offsetLeft + ch.offsetWidth - box.pad[0]);
        my = Math.max(my, ch.offsetTop + ch.offsetHeight - box.pad[2]);
      }
      if (rw == null) el.style.width = (mx + box.pad[0] + box.pad[1] + 2 * box.border) + 'px';
      if (rh == null) el.style.height = (my + box.pad[2] + box.pad[3] + 2 * box.border) + 'px';
    }

    const W = el.offsetWidth, H = el.offsetHeight;
    this.buildDecor(node, el, W, H, s);

    // position
    if (!flexChild) {
      const pos = p.pos(node);
      const x = pos.ux === UNIT.PCT ? Math.trunc(pctx.cw * pos.x / 100) : pos.x;
      const y = pos.uy === UNIT.PCT ? Math.trunc(pctx.ch * pos.y / 100) : pos.y;
      const { ax, ay } = type === 'TABPAGE' ? { ax: 0, ay: 0 } : anchor(p.align(node), pctx.cw, pctx.ch, W, H);
      el.style.left = (pctx.padL + ax + (type === 'TABPAGE' ? 0 : x)) + 'px';
      el.style.top = (pctx.padT + ay + (type === 'TABPAGE' ? 0 : y)) + 'px';
    }
    this.meta.set(node.guid, { el, ...ctx, flexChild, parentCtx: pctx });
    return el;
  }

  applyFlex(el, l, s) {
    el.style.display = 'flex';
    const dir = (l.flow === 1 ? 'column' : 'row') + (l.reversed ? '-reverse' : '');
    el.style.flexDirection = dir;
    el.style.flexWrap = l.wrap ? 'wrap' : 'nowrap';
    // stored alignment order: START, CENTER, END, SPACE_BETWEEN, SPACE_AROUND, SPACE_EVENLY
    const J = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
    el.style.justifyContent = J[l.main] || 'flex-start';
    el.style.alignItems = J[l.cross] || 'flex-start';
    el.style.alignContent = J[l.track] || 'flex-start';
    const row = Object.entries(s).find(([k]) => /padrow/.test(k))?.[1]?.integer;
    const col = Object.entries(s).find(([k]) => /padcol/.test(k))?.[1]?.integer;
    el.style.rowGap = (row ?? this.theme.gap) + 'px';
    el.style.columnGap = (col ?? this.theme.gap) + 'px';
  }

  activeTab(tabview) {
    const n = tabview.children.length;
    const i = this.view.activeTab?.get(tabview.guid) ?? 0;
    return Math.min(i, n - 1);
  }

  part(el, cls, css = {}) {
    const d = document.createElement('div');
    d.className = 'lv-part ' + cls;
    Object.assign(d.style, css);
    el.appendChild(d);
    return d;
  }

  textSpan(el, text, cls = 'lv-text') {
    const sp = document.createElement('span');
    sp.className = 'lv-part ' + cls;
    sp.textContent = text;
    el.appendChild(sp);
    return sp;
  }

  /** Inner parts that influence the content size. */
  buildContent(node, el, s, rw, rh) {
    const p = this.p, t = this.theme;
    switch (node.saved_objtypeKey) {
      case 'LABEL': {
        const mode = p.str(node, 'Long_mode', 'WRAP');
        let text = unescapeText(p.str(node, 'Text', 'Text'));
        if (p.bool(node, 'Recolor')) text = text.replace(/#[0-9a-fA-F]{6}\s([^#]*)#/g, '$1');
        el.style.whiteSpace = rw == null ? 'pre' : mode === 'WRAP' ? 'pre-wrap' : 'pre';
        if (mode === 'DOT') el.style.textOverflow = 'ellipsis';
        el.classList.add('lv-textbox');
        this.textSpan(el, text);
        break;
      }
      case 'CHECKBOX': {
        el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '6px'; el.style.whiteSpace = 'pre';
        const fs = parseFloat(el.style.fontSize) || 14;
        const bs = this.partStyle(node, 'bullet');
        const checked = p.bool(node, 'Checked');
        const b = this.part(el, 'lv-cb-bullet', { width: lineHeight(fs) + 2 + 'px', height: lineHeight(fs) + 2 + 'px', flex: '0 0 auto' });
        this.applyBox(b, bs, { bg: checked ? t.primary : t.card, border: 2, borderColor: checked ? t.primary : mix(t.primary, t.card, 0.2), radius: 5, pad: 0 });
        if (checked) { b.textContent = SYM.ok; b.classList.add('lv-sym'); }
        this.textSpan(el, unescapeText(p.str(node, 'Title', 'Checkbox')));
        break;
      }
      case 'DROPDOWN': {
        const opts = unescapeText(p.str(node, 'Options', 'Option 1\nOption 2\nOption 3')).split('\n');
        const sel = Math.max(0, Math.min(p.int(node, 'Selected', 0), opts.length - 1));
        const txt = p.bool(node, 'Show_selected', true) ? opts[sel] : (p.str(node, 'Base_text') || opts[sel]);
        el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.whiteSpace = 'pre';
        const sp = this.textSpan(el, txt); sp.style.flex = '1'; sp.style.overflow = 'hidden';
        const a = this.textSpan(el, SYM.down, 'lv-sym'); a.style.marginLeft = '8px'; a.style.fontSize = '0.8em';
        if (rh == null) el.style.minHeight = '0';
        break;
      }
      case 'ROLLER': {
        const opts = unescapeText(p.str(node, 'Options', 'Option 1\nOption 2\nOption 3')).split('\n');
        const sel = Math.min(p.int(node, 'Selected', 0), opts.length - 1);
        const fs = parseFloat(el.style.fontSize) || 14;
        const lh = lineHeight(fs) + 10;
        el.style.textAlign ||= 'center';
        el.style.whiteSpace = 'pre';
        const H = rh ?? lh * 3;
        if (rh == null) el.style.height = H + 'px';
        const list = this.part(el, 'lv-roller-list', { position: 'relative' });
        const ss = this.partStyle(node, 'selected');
        const band = this.part(el, 'lv-roller-sel', { position: 'absolute', left: '0', right: '0', height: lh + 'px', top: Math.round(H / 2 - lh / 2) + 'px' });
        this.applyBox(band, ss, { bg: t.primary, pad: 0 });
        band.style.color = ss.textcolor ? rgba(ss.textcolor.intarray) : '#FFFFFF';
        band.style.display = 'flex'; band.style.alignItems = 'center'; band.style.justifyContent = 'center';
        band.textContent = opts[sel] ?? '';
        list.style.top = Math.round(H / 2 - lh / 2 - sel * lh) + 'px';
        for (const o of opts) { const r = document.createElement('div'); r.textContent = o || ' '; r.style.height = lh + 'px'; r.style.lineHeight = lh + 'px'; list.appendChild(r); }
        if (rw == null) { el.style.width = 'max-content'; }
        el.style.paddingTop = el.style.paddingBottom = '0';
        break;
      }
      case 'TEXTAREA': {
        const text = unescapeText(p.str(node, 'Text', ''));
        el.style.whiteSpace = p.bool(node, 'One_line_mode') ? 'pre' : 'pre-wrap';
        el.style.wordBreak = 'break-word';
        if (text) {
          const shown = p.bool(node, 'Password_mode') ? '•'.repeat(text.length) : text;
          this.textSpan(el, shown);
        } else {
          const ph = this.textSpan(el, unescapeText(p.str(node, 'Placeholder', '')), 'lv-placeholder');
          const ps = this.partStyle(node, 'placeholder');
          ph.style.color = ps.textcolor ? rgba(ps.textcolor.intarray) : t.muted;
        }
        this.part(el, 'lv-cursor', { display: 'inline-block', width: '2px', height: '1.1em', verticalAlign: 'text-bottom', background: t.primary, marginLeft: '1px' });
        break;
      }
      case 'SPINBOX': {
        const [digits = 5, sep = 0] = p.arr(node, 'Digit_format', [5, 0]);
        const v = p.int(node, 'Value', 0);
        let str = String(Math.abs(v)).padStart(digits, '0');
        if (sep > 0 && sep < digits) str = str.slice(0, sep) + '.' + str.slice(sep);
        el.style.textAlign ||= 'center'; el.style.whiteSpace = 'pre';
        this.textSpan(el, (v < 0 ? '-' : '') + str);
        break;
      }
      case 'BUTTON': case 'PANEL': case 'CONTAINER': case 'SCREEN': case 'TABPAGE':
        if (rw == null && !node.children.length) el.style.width = '0';
        break;
      case 'IMAGE': {
        const asset = p.str(node, 'Asset');
        const info = this.assets.image(asset);
        if (rw == null) el.style.width = (info?.w ?? 32) + 'px';
        if (rh == null) el.style.height = (info?.h ?? 32) + 'px';
        break;
      }
      case 'TABVIEW': {
        const pos = p.str(node, 'Tab_position', 'TOP');
        const size = p.int(node, 'Tab_size', 50);
        const vertical = pos === 'LEFT' || pos === 'RIGHT';
        el.style.display = 'flex';
        el.style.flexDirection = { TOP: 'column', BOTTOM: 'column-reverse', LEFT: 'row', RIGHT: 'row-reverse' }[pos] || 'column';
        const bar = this.part(el, 'lv-tab-btns', { flex: `0 0 ${size}px`, display: 'flex', flexDirection: vertical ? 'column' : 'row' });
        this.applyBox(bar, this.partStyle(node, 'buttons_main'), { bg: t.card, pad: 0 });
        const items = this.partStyle(node, 'buttons_items');
        const act = this.activeTab(node);
        node.children.forEach((tp, i) => {
          const b = document.createElement('div');
          b.className = 'lv-tab-btn' + (i === act ? ' active' : '');
          b.dataset.tabIndex = i; b.dataset.tabview = node.guid;
          b.textContent = unescapeText(p.str(tp, 'Title', p.name(tp)));
          this.applyText(b, items);
          b.style.color ||= i === act ? t.primary : t.muted;
          if (i === act) b.style.boxShadow = vertical ? `inset ${pos === 'LEFT' ? '-' : ''}3px 0 0 ${t.primary}` : `inset 0 ${pos === 'TOP' ? '-' : ''}3px 0 ${t.primary}`;
          bar.appendChild(b);
        });
        const content = this.part(el, 'lv-tab-content', { flex: '1 1 auto', position: 'relative', overflow: 'hidden' });
        content.classList.remove('lv-part');
        break;
      }
    }
  }

  /** Decorations that depend on the final size. */
  buildDecor(node, el, W, H, s) {
    const p = this.p, t = this.theme;
    const type = node.saved_objtypeKey;
    switch (type) {
      case 'IMAGE': {
        const asset = p.str(node, 'Asset');
        const url = this.assets.url(asset);
        const scale = p.int(node, 'Scale', 256) / 256 || 1;
        const rot = p.int(node, 'Rotation', 0) / 10;
        const [px, py] = p.arr(node, 'Pivot', [0, 0]);
        if (url) {
          const im = document.createElement('img');
          im.className = 'lv-part lv-img'; im.src = url; im.draggable = false;
          const info = this.assets.image(asset);
          const iw = info?.w ?? W, ih = info?.h ?? H;
          Object.assign(im.style, { position: 'absolute', width: iw + 'px', height: ih + 'px', left: Math.round((W - iw) / 2) + 'px', top: Math.round((H - ih) / 2) + 'px' });
          if (scale !== 1 || rot) { im.style.transformOrigin = `${px}px ${py}px`; im.style.transform = `scale(${scale}) rotate(${rot}deg)`; }
          const ic = s.imagerecolor?.intarray || s.imgrecolor?.intarray;
          if (ic) im.style.filter = 'grayscale(1)';
          el.appendChild(im);
        } else {
          el.classList.add('lv-img-missing');
          this.textSpan(el, asset ? asset.split('/').pop() : 'no image', 'lv-img-label');
        }
        break;
      }
      case 'SLIDER': case 'BAR': {
        const [min, max] = p.arr(node, 'Range', [0, 100]);
        const v = p.int(node, 'Value', 0);
        const mode = p.str(node, 'Mode', 'NORMAL');
        const v0 = mode === 'RANGE' ? p.int(node, type === 'SLIDER' ? 'Value_left' : 'Value_start', 0) : mode === 'SYMMETRICAL' ? Math.max(min, Math.min(max, 0)) : min;
        const frac = (x) => (max === min ? 0 : (Math.max(min, Math.min(max, x)) - min) / (max - min));
        const a = Math.min(frac(v0), frac(v)), b = Math.max(frac(v0), frac(v));
        const vertical = H > W;
        const ind = this.part(el, 'lv-indicator', { position: 'absolute', borderRadius: el.style.borderRadius || '999px' });
        this.applyBox(ind, this.partStyle(node, 'indicator'), { bg: t.primary, radius: 999, pad: 0 });
        if (vertical) Object.assign(ind.style, { left: '0', right: '0', bottom: a * 100 + '%', height: (b - a) * 100 + '%' });
        else Object.assign(ind.style, { top: '0', bottom: '0', left: a * 100 + '%', width: (b - a) * 100 + '%' });
        if (type === 'SLIDER') {
          el.style.overflow = 'visible';
          const k = Math.min(W, H) + 12;
          const mk = (f) => {
            const kn = this.part(el, 'lv-knob', { position: 'absolute', width: k + 'px', height: k + 'px' });
            this.applyBox(kn, this.partStyle(node, 'knob'), { bg: t.primary, radius: 999, pad: 0 });
            if (vertical) Object.assign(kn.style, { left: (W - k) / 2 + 'px', top: (H - f * H - k / 2) + 'px' });
            else Object.assign(kn.style, { top: (H - k) / 2 + 'px', left: (f * W - k / 2) + 'px' });
          };
          if (mode === 'RANGE') mk(frac(v0));
          mk(frac(v));
        }
        break;
      }
      case 'SWITCH': {
        const checked = p.bool(node, 'Checked');
        const ind = this.part(el, 'lv-indicator', { position: 'absolute', inset: '0', borderRadius: '999px', display: checked ? '' : 'none' });
        this.applyBox(ind, this.partStyle(node, 'indicator'), { bg: t.primary, radius: 999, pad: 0 });
        const k = H - 8;
        const kn = this.part(el, 'lv-knob', { position: 'absolute', width: k + 'px', height: k + 'px', top: '4px', left: (checked ? W - k - 4 : 4) + 'px' });
        this.applyBox(kn, this.partStyle(node, 'knob'), { bg: '#FFFFFF', radius: 999, pad: 0 });
        break;
      }
      case 'ARC': case 'SPINNER': this.drawArc(node, el, W, H, s); break;
      case 'KEYBOARD': this.drawKeyboard(node, el); break;
      case 'COLORWHEEL': {
        const r = this.part(el, 'lv-cw', { position: 'absolute', inset: '0', borderRadius: '50%', background: 'conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)' });
        this.part(r, '', { position: 'absolute', inset: '20px', borderRadius: '50%', background: t.scr });
        break;
      }
      case 'CHART': {
        el.style.backgroundImage = `linear-gradient(${t.border} 1px, transparent 1px), linear-gradient(90deg, ${t.border} 1px, transparent 1px)`;
        el.style.backgroundSize = `${(W - 30) / 10}px ${(H - 30) / 5}px`;
        break;
      }
      case 'CALENDAR': {
        if (!el.querySelector('.lv-cal')) {
          const g = this.part(el, 'lv-cal', { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: '11px', textAlign: 'center', gap: '2px' });
          'SMTWTFS'.split('').forEach((c) => { const d = document.createElement('div'); d.textContent = c; d.style.opacity = '.6'; g.appendChild(d); });
          for (let i = 1; i <= 30; i++) { const d = document.createElement('div'); d.textContent = i; g.appendChild(d); }
        }
        break;
      }
    }
  }

  drawArc(node, el, W, H, s) {
    const p = this.p, t = this.theme;
    const isSpinner = node.saved_objtypeKey === 'SPINNER';
    const main = s, ind = this.partStyle(node, 'indicator');
    const pad = this.padding(s, 0);
    const bw = main.arcwidth?.integer ?? 12, iw = ind.arcwidth?.integer ?? bw;
    const bcol = main.arccolor?.intarray ? rgba(main.arccolor.intarray) : t.grey;
    const icol = ind.arccolor?.intarray ? rgba(ind.arccolor.intarray) : t.primary;
    const rounded = main.arcrounded?.strval !== 'False';
    const size = Math.min(W - pad[0] - pad[1], H - pad[2] - pad[3]);
    const cx = pad[0] + (W - pad[0] - pad[1]) / 2, cy = pad[2] + (H - pad[2] - pad[3]) / 2;
    const R = size / 2;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'lv-part lv-arc-svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0'; svg.style.overflow = 'visible';
    const arcPath = (r, a0, a1) => {
      let span = ((a1 - a0) % 360 + 360) % 360;
      if (span === 0 && a1 !== a0) span = 360;
      if (span === 0) return '';
      const pt = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
      if (span >= 359.99) { const [x0, y0] = pt(a0), [x1, y1] = pt(a0 + 180); return `M${x0} ${y0} A${r} ${r} 0 1 1 ${x1} ${y1} A${r} ${r} 0 1 1 ${x0} ${y0}`; }
      const [x0, y0] = pt(a0), [x1, y1] = pt(a0 + span);
      return `M${x0} ${y0} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x1} ${y1}`;
    };
    const stroke = (d, color, width) => {
      if (!d || !width) return;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', width); path.setAttribute('stroke-linecap', rounded ? 'round' : 'butt');
      svg.appendChild(path);
      return path;
    };
    let rot = p.int(node, 'Rotation', 0);
    if (isSpinner) {
      stroke(arcPath(R - bw / 2, 0, 360), bcol, bw);
      const g = stroke(arcPath(R - bw / 2, -90, -30), icol, iw);
      if (g) { g.style.transformOrigin = `${cx}px ${cy}px`; g.classList.add('lv-spin'); }
      el.appendChild(svg);
      return;
    }
    const [bs, be] = p.arr(node, 'Bg_angles', [135, 45]);
    const [min, max] = p.arr(node, 'Range', [0, 100]);
    const v = Math.max(min, Math.min(max, p.int(node, 'Value', 0)));
    const mode = p.str(node, 'Mode', 'NORMAL');
    let span = ((be - bs) % 360 + 360) % 360; if (span === 0) span = 360;
    const f = max === min ? 0 : (v - min) / (max - min);
    let i0 = bs, i1 = bs + span * f;
    if (mode === 'REVERSE') { i0 = bs + span * (1 - f); i1 = bs + span; }
    if (mode === 'SYMMETRICAL') { const mid = bs + span / 2; const vv = bs + span * f; i0 = Math.min(mid, vv); i1 = Math.max(mid, vv); }
    stroke(arcPath(R - bw / 2, bs + rot, bs + span + rot), bcol, bw);
    if (i1 > i0) stroke(arcPath(R - iw / 2, i0 + rot, i1 + rot), icol, iw);
    el.appendChild(svg);
    // knob
    const ks = this.partStyle(node, 'knob');
    const ka = (mode === 'REVERSE' ? i0 : i1) + rot;
    const kr = R - iw / 2;
    const kpad = ks.padding?.intarray?.[0] ?? 4;
    const kd = iw + kpad * 2;
    const kn = this.part(el, 'lv-knob', { position: 'absolute', width: kd + 'px', height: kd + 'px', left: cx + kr * Math.cos(ka * Math.PI / 180) - kd / 2 + 'px', top: cy + kr * Math.sin(ka * Math.PI / 180) - kd / 2 + 'px' });
    this.applyBox(kn, ks, { bg: t.primary, radius: 999, pad: 0 });
    if (ks.bgcolor?.intarray?.[3] === 0) kn.style.display = 'none';
    el.style.overflow = 'visible';
  }

  drawKeyboard(node, el) {
    const t = this.theme;
    const mode = this.p.str(node, 'Mode', 'TEXT_LOWER');
    const L = {
      TEXT_LOWER: [['1#', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', SYM.bksp], ['ABC', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', SYM.nl], ['_', '-', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ',', ':'], [SYM.kb, SYM.left, ' ', SYM.right, SYM.ok]],
      TEXT_UPPER: [['1#', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', SYM.bksp], ['abc', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', SYM.nl], ['_', '-', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', ',', ':'], [SYM.kb, SYM.left, ' ', SYM.right, SYM.ok]],
      SPECIAL: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', SYM.bksp], ['abc', '+', '-', '/', '*', '=', '%', '!', '?', '#', '<', '>'], ['\\', '@', '$', '(', ')', '{', '}', '[', ']', ';', '"', "'"], [SYM.kb, SYM.left, ' ', SYM.right, SYM.ok]],
      NUMBER: [['1', '2', '3', SYM.kb], ['4', '5', '6', SYM.ok], ['7', '8', '9', SYM.bksp], ['+/-', '0', '.', SYM.left, SYM.right]],
    }[mode] || [];
    const wrap = this.part(el, 'lv-kb', { display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' });
    const items = this.partStyle(node, 'items');
    for (const row of L) {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:4px;flex:1;min-height:0';
      for (const k of row) {
        const b = document.createElement('div');
        b.className = 'lv-kb-key' + (k.length === 1 && k >= '' ? ' lv-sym' : '');
        b.textContent = k;
        b.style.flex = k === ' ' ? '6' : '1';
        this.applyBox(b, items, { bg: /^[-]|^(ABC|abc|1#)$/.test(k) ? (t.dark ? '#3A3D43' : '#D0D0D0') : t.card, radius: 6, pad: 0 });
        this.applyText(b, items);
        r.appendChild(b);
      }
      wrap.appendChild(r);
    }
  }
}

/** Absolute box of an element relative to the given screen element (unscaled px). */
export function absBox(el, screenEl) {
  let x = 0, y = 0, e = el;
  while (e && e !== screenEl) {
    x += e.offsetLeft; y += e.offsetTop;
    const op = e.offsetParent;
    if (!op) break;
    x += op.clientLeft; y += op.clientTop;
    e = op;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
