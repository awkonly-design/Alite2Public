// Canvas: renders the current screen, zoom/pan, selection overlay, move/resize with snapping, marquee selection.
import { Renderer, absBox, anchor } from './render.js';
import { UNIT } from './project.js';
import { h, wicon } from './icons.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HEADER_H = 24, GAP = 70;

export class Canvas {
  constructor(app) {
    this.app = app;
    this.vp = document.getElementById('canvas-viewport');
    this.world = document.getElementById('world');
    this.overlay = document.getElementById('overlay');
    this.zoom = 1; this.pan = { x: 60, y: 60 };
    this.frames = new Map();
    this.k = 1;
    this.drag = null;
    this.hoverGuid = null;
    this.space = false;
    this.bind();
  }

  get p() { return this.app.project; }

  // ---------------------------------------------------------------- layout & render
  layoutScreens() {
    const p = this.p, W = p.width, H = p.height;
    const screens = this.app.settings.showAll ? p.screens() : p.screens().filter((s) => s.guid === this.app.currentScreen);
    const pos = new Map();
    if (!this.app.settings.showAll) { if (screens[0]) pos.set(screens[0].guid, { x: 0, y: 0 }); this.positions = pos; return screens; }
    const raw = screens.map((s) => ({ s, x: s.editor_posx, y: s.editor_posy }));
    let ok = raw.every((r) => typeof r.x === 'number' && typeof r.y === 'number');
    let k = 1;
    if (ok) {
      const needX = W + GAP, needY = H + HEADER_H + GAP;
      for (let i = 0; i < raw.length && ok; i++) for (let j = i + 1; j < raw.length; j++) {
        const dx = Math.abs(raw[i].x - raw[j].x), dy = Math.abs(raw[i].y - raw[j].y);
        if (!dx && !dy) { ok = false; break; }
        const kk = Math.min(dx ? needX / dx : Infinity, dy ? needY / dy : Infinity);
        k = Math.max(k, kk);
      }
      if (k > 40) ok = false;
    }
    if (ok) {
      this.k = k;
      const minX = Math.min(...raw.map((r) => r.x)), minY = Math.min(...raw.map((r) => r.y));
      this.origin = { x: minX, y: minY };
      raw.forEach((r) => pos.set(r.s.guid, { x: Math.round((r.x - minX) * k), y: Math.round((r.y - minY) * k) }));
    } else {
      this.k = 1; this.origin = { x: 0, y: 0 };
      const cols = Math.max(1, Math.ceil(Math.sqrt(screens.length * 1.6)));
      screens.forEach((s, i) => pos.set(s.guid, { x: (i % cols) * (W + GAP), y: Math.floor(i / cols) * (H + HEADER_H + GAP) }));
    }
    this.positions = pos;
    return screens;
  }

  render() {
    this.world.textContent = '';
    this.frames.clear();
    if (!this.p) { this.overlay.textContent = ''; return; }
    const screens = this.layoutScreens();
    for (const s of screens) this.buildFrame(s);
    this.world.classList.toggle('pixelated', !!this.app.settings.pixelated);
    this.applyTransform();
  }

  buildFrame(screen) {
    const pos = this.positions.get(screen.guid) || { x: 0, y: 0 };
    const frame = h('div', { class: 'screen-frame' + (screen.guid === this.app.currentScreen ? ' current' : ''), style: { left: pos.x + 'px', top: pos.y + 'px' } });
    const header = h('div', { class: 'screen-header', 'data-screen-header': screen.guid },
      h('span', { class: 'ticon', html: wicon('SCREEN') }), this.p.name(screen));
    frame.append(header);
    this.world.append(frame);
    const f = { frame, header, screen, x: pos.x, y: pos.y, el: null, renderer: null };
    this.frames.set(screen.guid, f);
    this.paintScreen(f);
    return f;
  }

  paintScreen(f) {
    const r = new Renderer(this.p, this.app.assets, this.app.view);
    const old = f.el;
    // the screen element is attached before its children render so text can be measured
    const el = r.renderScreen(f.screen, (el) => { if (old) old.replaceWith(el); else f.frame.append(el); });
    f.el = el; f.renderer = r;
  }

  /** Re-render screens (all, or only those containing the given guids). */
  refresh(guids) {
    if (!this.p) return;
    if (!guids) { this.render(); return; }
    const screens = new Set(guids.map((g) => this.p.screenOf(this.p.get(g))?.guid).filter(Boolean));
    for (const sg of screens) { const f = this.frames.get(sg); if (f) this.paintScreen(f); }
    this.drawOverlay();
  }

  updateCurrentMarker() {
    for (const [g, f] of this.frames) f.frame.classList.toggle('current', g === this.app.currentScreen);
  }

  applyTransform() {
    this.world.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    // keep the screen header at constant size
    for (const f of this.frames.values()) f.header.style.transform = `scale(${1 / this.zoom})`;
    this.app.onZoom?.(this.zoom);
    this.drawOverlay();
  }

  // ---------------------------------------------------------------- geometry
  frameOf(node) { const s = this.p.screenOf(node); return s && this.frames.get(s.guid); }
  meta(node) { const f = this.frameOf(node); return f?.renderer?.meta.get(node.guid); }
  /** Box in screen-local lv px. */
  localBox(node) {
    const f = this.frameOf(node); if (!f) return null;
    if (node === f.screen) return { x: 0, y: 0, w: this.p.width, h: this.p.height };
    const m = f.renderer.meta.get(node.guid);
    if (!m || !m.el.isConnected || (m.el.offsetParent === null && m.el.style.display === 'none')) return null;
    return absBox(m.el, f.el);
  }
  /** Origin (screen-local) of the parent content area used for positioning node. */
  contentOrigin(node) {
    const f = this.frameOf(node), m = this.meta(node);
    if (!m) return { x: 0, y: 0 };
    const op = m.el.offsetParent;
    if (!op || op === f.el) return { x: m.parentCtx.padL, y: m.parentCtx.padT };
    const b = absBox(op, f.el);
    return { x: b.x + op.clientLeft + m.parentCtx.padL, y: b.y + op.clientTop + m.parentCtx.padT };
  }
  toView(f, x, y) { return { x: this.pan.x + (f.x + x) * this.zoom, y: this.pan.y + (f.y + y) * this.zoom }; }
  eventPoint(e) { const r = this.vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  toWorld(pt) { return { x: (pt.x - this.pan.x) / this.zoom, y: (pt.y - this.pan.y) / this.zoom }; }
  /** Screen-local point for frame f from a view point. */
  toLocal(f, pt) { const w = this.toWorld(pt); return { x: w.x - f.x, y: w.y - f.y }; }

  /** Set the position of node so its top-left lands at screen-local (x,y). Optional new size. */
  placeNode(node, x, y, w, h, ctxInfo) {
    const p = this.p;
    const info = ctxInfo || this.dragInfo(node);
    const pc = info.pctx;
    const W = w ?? info.box.w, H = h ?? info.box.h;
    if (w != null || h != null) {
      const s = p.size(node);
      const uw = s.uw === UNIT.CONTENT && w != null ? UNIT.PX : s.uw;
      const uh = s.uh === UNIT.CONTENT && h != null ? UNIT.PX : s.uh;
      const nw = w == null ? s.w : uw === UNIT.PCT ? Math.round(W * 100 / Math.max(1, pc.cw)) : Math.round(W);
      const nh = h == null ? s.h : uh === UNIT.PCT ? Math.round(H * 100 / Math.max(1, pc.ch)) : Math.round(H);
      p.setSize(node, nw, nh, uw, uh);
    }
    if (info.flexChild || x == null) return;
    const { ax, ay } = anchor(p.align(node), pc.cw, pc.ch, W, H);
    const rx = x - info.origin.x - ax, ry = y - info.origin.y - ay;
    const pos = p.pos(node);
    const nx = pos.ux === UNIT.PCT ? Math.round(rx * 100 / Math.max(1, pc.cw)) : Math.round(rx);
    const ny = pos.uy === UNIT.PCT ? Math.round(ry * 100 / Math.max(1, pc.ch)) : Math.round(ry);
    p.setPos(node, nx, ny);
  }

  dragInfo(node) {
    const m = this.meta(node);
    return { node, box: this.localBox(node), origin: this.contentOrigin(node), pctx: m?.parentCtx || { cw: this.p.width, ch: this.p.height, padL: 0, padT: 0 }, flexChild: !!m?.flexChild };
  }

  /** Offset for CENTER align that centers a new child of `parent` at screen-local point pt. */
  centerOffset(parent, pt) {
    const f = this.frameOf(parent);
    if (!f) return { x: 0, y: 0 };
    let ox = 0, oy = 0, cw = this.p.width, ch = this.p.height;
    if (parent !== f.screen) {
      const m = this.meta(parent);
      if (!m) return { x: 0, y: 0 };
      const b = absBox(m.el, f.el);
      ox = b.x + m.el.clientLeft + m.padL; oy = b.y + m.el.clientTop + m.padT; cw = m.cw; ch = m.ch;
    }
    return { x: Math.round(pt.x - ox - Math.trunc(cw / 2)), y: Math.round(pt.y - oy - Math.trunc(ch / 2)) };
  }

  // ---------------------------------------------------------------- overlay
  drawOverlay() {
    const ov = this.overlay;
    ov.textContent = '';
    if (!this.p) return;
    const sel = this.app.selection;
    const add = (cls, b, f) => {
      const a = this.toView(f, b.x, b.y);
      const d = h('div', { class: cls, style: { left: a.x + 'px', top: a.y + 'px', width: b.w * this.zoom + 'px', height: b.h * this.zoom + 'px' } });
      ov.append(d);
      return { d, a };
    };
    // hover
    if (this.hoverGuid && !sel.includes(this.hoverGuid) && !this.drag) {
      const n = this.p.get(this.hoverGuid), f = n && this.frameOf(n), b = n && this.localBox(n);
      if (f && b) add('hover-box', b, f);
    }
    // parent of single selection
    if (sel.length === 1) {
      const n = this.p.get(sel[0]); const par = n && this.p.parent(n);
      if (par && par.saved_objtypeKey !== 'SCREEN') { const f = this.frameOf(par), b = this.localBox(par); if (f && b) add('sel-box parent', b, f); }
    }
    sel.forEach((g, i) => {
      const n = this.p.get(g); if (!n || n.saved_objtypeKey === 'SCREEN') return;
      const f = this.frameOf(n), b = this.localBox(n); if (!f || !b) return;
      const primary = i === sel.length - 1;
      const { a } = add('sel-box' + (primary ? ' primary' : '') + (this.p.isLocked(n) ? ' locked' : ''), b, f);
      if (sel.length === 1 && !this.p.isLocked(n) && n.saved_objtypeKey !== 'TABPAGE') {
        const W = b.w * this.zoom, H = b.h * this.zoom;
        const pts = { nw: [0, 0], n: [W / 2, 0], ne: [W, 0], e: [W, H / 2], se: [W, H], s: [W / 2, H], sw: [0, H], w: [0, H / 2] };
        for (const k of HANDLES) ov.append(h('div', { class: 'handle', 'data-h': k, style: { left: a.x + pts[k][0] + 'px', top: a.y + pts[k][1] + 'px' } }));
        if (this.drag?.mode === 'resize' || this.drag?.mode === 'move') {
          ov.append(h('div', { class: 'size-tag', style: { left: a.x + W / 2 + 'px', top: a.y + H + 'px' } }, this.drag.mode === 'move' ? this.posLabel(n) : `${b.w} × ${b.h}`));
        }
      }
    });
    // guides
    for (const g of this.guides || []) {
      const f = g.f;
      if (g.axis === 'x') { const a = this.toView(f, g.v, g.from), b = this.toView(f, g.v, g.to); ov.append(h('div', { class: 'guide v', style: { left: a.x + 'px', top: a.y + 'px', height: b.y - a.y + 'px' } })); }
      else { const a = this.toView(f, g.from, g.v), b = this.toView(f, g.to, g.v); ov.append(h('div', { class: 'guide h', style: { left: a.x + 'px', top: a.y + 'px', width: b.x - a.x + 'px' } })); }
    }
    if (this.marquee) {
      const m = this.marquee;
      ov.append(h('div', { class: 'marquee', style: { left: Math.min(m.x0, m.x1) + 'px', top: Math.min(m.y0, m.y1) + 'px', width: Math.abs(m.x1 - m.x0) + 'px', height: Math.abs(m.y1 - m.y0) + 'px' } }));
    }
  }
  posLabel(n) { const p = this.p.pos(n); const u = (v) => (v === UNIT.PCT ? '%' : ''); return `${p.x}${u(p.ux)}, ${p.y}${u(p.uy)}`; }

  // ---------------------------------------------------------------- hit testing
  hit(e) {
    const t = e.target;
    if (t.closest?.('.handle')) return { handle: t.dataset.h };
    const hdr = t.closest?.('[data-screen-header]');
    if (hdr) return { screenHeader: this.p.get(hdr.dataset.screenHeader) };
    const tab = t.closest?.('.lv-tab-btn');
    if (tab && this.world.contains(tab)) return { tab };
    const el = t.closest?.('[data-guid]');
    if (el && this.world.contains(el)) {
      let n = this.p.get(el.dataset.guid);
      // Alt-click selects the parent instead of the deepest widget
      if (e.altKey && n && n.saved_objtypeKey !== 'SCREEN') n = this.p.parent(n) || n;
      return { node: n };
    }
    return {};
  }

  // ---------------------------------------------------------------- events
  bind() {
    const vp = this.vp;
    vp.addEventListener('mousedown', (e) => this.onDown(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    vp.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    vp.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!this.p) return;
      const hit = this.hit(e);
      const n = hit.node || hit.screenHeader;
      if (n && !this.app.selection.includes(n.guid)) this.app.select([n.guid]);
      this.app.showCanvasMenu(e.clientX, e.clientY, n);
    });
    vp.addEventListener('mouseleave', () => { this.hoverGuid = null; if (!this.drag) this.drawOverlay(); });
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !isTyping(e)) { if (!this.space) { this.space = true; vp.classList.add('space'); } if (document.activeElement === vp || vp.contains(document.activeElement)) e.preventDefault(); } });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') { this.space = false; vp.classList.remove('space'); } });
    new ResizeObserver(() => this.drawOverlay()).observe(vp);

  }

  onDown(e) {
    if (!this.p) return;
    this.vp.focus({ preventScroll: true });
    const pt = this.eventPoint(e);
    if (e.button === 1 || (e.button === 0 && this.space)) { e.preventDefault(); this.startPan(pt); return; }
    if (e.button !== 0) return;
    const hit = this.hit(e);
    const sel = this.app.selection;
    if (hit.handle) {
      const n = this.p.get(sel[sel.length - 1]);
      this.drag = { mode: 'resize', handle: hit.handle, start: pt, node: n, info: this.dragInfo(n), moved: false };
      e.preventDefault();
      return;
    }
    if (hit.tab) {
      const tv = this.p.get(hit.tab.dataset.tabview), idx = +hit.tab.dataset.tabIndex;
      this.app.view.activeTab.set(tv.guid, idx);
      const page = tv.children[idx];
      this.app.select([page ? page.guid : tv.guid]);
      this.refresh([tv.guid]);
      return;
    }
    if (hit.screenHeader) {
      const s = hit.screenHeader;
      this.app.select([s.guid]);
      const f = this.frames.get(s.guid);
      if (this.app.settings.showAll && f) this.drag = { mode: 'screen', start: pt, f, x0: f.x, y0: f.y, moved: false };
      e.preventDefault();
      return;
    }
    if (hit.node) {
      const n = hit.node;
      const multi = e.shiftKey || e.metaKey || e.ctrlKey;
      if (n.saved_objtypeKey === 'SCREEN') {
        if (!multi) this.app.select([n.guid]);
        const f = this.frames.get(n.guid);
        this.drag = { mode: 'marquee', start: pt, f, additive: multi, base: multi ? sel.slice() : [], moved: false };
        e.preventDefault();
        return;
      }
      if (multi) {
        if (sel.includes(n.guid)) { this.app.select(sel.filter((g) => g !== n.guid)); return; }
        this.app.select([...sel.filter((g) => this.p.get(g)?.saved_objtypeKey !== 'SCREEN'), n.guid]);
      } else if (!sel.includes(n.guid)) this.app.select([n.guid]);
      else if (sel[sel.length - 1] !== n.guid) this.app.select([...sel.filter((g) => g !== n.guid), n.guid]);
      // prepare move
      const nodes = this.movable(this.app.selection.map((g) => this.p.get(g)));
      if (nodes.length) this.drag = { mode: 'move', start: pt, nodes: nodes.map((x) => this.dragInfo(x)), primary: n, moved: false };
      e.preventDefault();
      return;
    }
    // empty space
    if (!(e.shiftKey || e.metaKey || e.ctrlKey)) this.app.select([]);
    this.startPan(pt);
  }

  movable(nodes) {
    const set = new Set(nodes.filter(Boolean));
    return [...set].filter((n) => n.saved_objtypeKey !== 'SCREEN' && n.saved_objtypeKey !== 'TABPAGE' && !this.p.isLocked(n) && !this.p.ancestors(n).some((a) => set.has(a)) && !this.p.inFlex(n));
  }

  startPan(pt) { this.drag = { mode: 'pan', start: pt, pan0: { ...this.pan } }; this.vp.classList.add('panning'); }

  onMove(e) {
    if (!this.p) return;
    const pt = this.eventPoint(e);
    const d = this.drag;
    if (!d) {
      if (e.target instanceof Node && this.vp.contains(e.target)) {
        const hit = this.hit(e);
        const g = hit.node && hit.node.saved_objtypeKey !== 'SCREEN' ? hit.node.guid : null;
        if (g !== this.hoverGuid) { this.hoverGuid = g; this.drawOverlay(); }
        const f = this.frames.get(this.app.currentScreen);
        if (f) { const l = this.toLocal(f, pt); this.app.setCursor(Math.round(l.x), Math.round(l.y)); }
      }
      return;
    }
    const dx = pt.x - d.start.x, dy = pt.y - d.start.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    d.moved = true;
    if (d.mode === 'pan') { this.pan = { x: d.pan0.x + dx, y: d.pan0.y + dy }; this.applyTransform(); return; }
    if (d.mode === 'screen') {
      d.f.x = Math.round(d.x0 + dx / this.zoom); d.f.y = Math.round(d.y0 + dy / this.zoom);
      d.f.frame.style.left = d.f.x + 'px'; d.f.frame.style.top = d.f.y + 'px';
      this.drawOverlay();
      return;
    }
    if (d.mode === 'marquee') {
      const a = d.start;
      this.marquee = { x0: a.x, y0: a.y, x1: pt.x, y1: pt.y };
      const l0 = this.toLocal(d.f, a), l1 = this.toLocal(d.f, pt);
      const r = { x0: Math.min(l0.x, l1.x), y0: Math.min(l0.y, l1.y), x1: Math.max(l0.x, l1.x), y1: Math.max(l0.y, l1.y) };
      const hits = [];
      this.p.walk(d.f.screen, (n) => {
        if (n === d.f.screen || this.p.isHidden(n)) return;
        const b = this.localBox(n);
        if (b && b.x >= r.x0 && b.y >= r.y0 && b.x + b.w <= r.x1 && b.y + b.h <= r.y1) hits.push(n);
      });
      const set = new Set(hits);
      const top = hits.filter((n) => !this.p.ancestors(n).some((a) => set.has(a))).map((n) => n.guid);
      this.app.select([...new Set([...d.base, ...top])], { silentCanvas: true });
      this.drawOverlay();
      return;
    }
    const z = this.zoom;
    let ldx = Math.round(dx / z), ldy = Math.round(dy / z);
    if (d.mode === 'move') {
      if (e.shiftKey) { if (Math.abs(ldx) > Math.abs(ldy)) ldy = 0; else ldx = 0; }
      const prim = d.nodes.find((i) => i.node === d.primary) || d.nodes[0];
      this.guides = [];
      if (this.app.settings.snap && !e.altKey && prim.box) {
        const b = { x: prim.box.x + ldx, y: prim.box.y + ldy, w: prim.box.w, h: prim.box.h };
        const s = this.snap(prim.node, b, { x: [0, 0.5, 1], y: [0, 0.5, 1] });
        ldx += s.dx; ldy += s.dy;
      }
      for (const info of d.nodes) if (info.box) this.placeNode(info.node, info.box.x + ldx, info.box.y + ldy, null, null, info);
      this.scheduleRefresh(d.nodes.map((i) => i.node.guid));
      return;
    }
    if (d.mode === 'resize') {
      const b0 = d.info.box; if (!b0) return;
      let x0 = b0.x, y0 = b0.y, x1 = b0.x + b0.w, y1 = b0.y + b0.h;
      const hd = d.handle;
      if (hd.includes('w')) x0 += ldx;
      if (hd.includes('e')) x1 += ldx;
      if (hd.includes('n')) y0 += ldy;
      if (hd.includes('s')) y1 += ldy;
      this.guides = [];
      if (this.app.settings.snap && !e.altKey) {
        const ex = hd.includes('w') ? [0] : hd.includes('e') ? [1] : [];
        const ey = hd.includes('n') ? [0] : hd.includes('s') ? [1] : [];
        const s = this.snap(d.node, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, { x: ex, y: ey });
        if (hd.includes('w')) x0 += s.dx; else if (hd.includes('e')) x1 += s.dx;
        if (hd.includes('n')) y0 += s.dy; else if (hd.includes('s')) y1 += s.dy;
      }
      if (e.shiftKey && b0.w && b0.h) {
        const ratio = b0.w / b0.h;
        let w = x1 - x0, hh = y1 - y0;
        if (hd.length === 2 || hd === 'e' || hd === 'w') hh = Math.round(w / ratio); else w = Math.round(hh * ratio);
        if (hd.includes('w')) x0 = x1 - w; else x1 = x0 + w;
        if (hd.includes('n')) y0 = y1 - hh; else y1 = y0 + hh;
      }
      if (x1 - x0 < 1) { if (hd.includes('w')) x0 = x1 - 1; else x1 = x0 + 1; }
      if (y1 - y0 < 1) { if (hd.includes('n')) y0 = y1 - 1; else y1 = y0 + 1; }
      const changeW = hd.includes('w') || hd.includes('e'), changeH = hd.includes('n') || hd.includes('s');
      this.placeNode(d.node, x0, y0, changeW ? x1 - x0 : null, changeH ? y1 - y0 : null, { ...d.info, box: { x: x0, y: y0, w: changeW ? x1 - x0 : b0.w, h: changeH ? y1 - y0 : b0.h } });
      this.scheduleRefresh([d.node.guid]);
    }
  }

  scheduleRefresh(guids) {
    this._pending = guids;
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      this.refresh(this._pending);
      this.app.info.render();
    });
  }

  onUp(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.vp.classList.remove('panning');
    this.guides = []; this.marquee = null;
    if (d.mode === 'move' && d.moved) this.app.commit(d.nodes.length > 1 ? `Move ${d.nodes.length} widgets` : `Move ${this.p.name(d.nodes[0].node)}`);
    else if (d.mode === 'resize' && d.moved) this.app.commit(`Resize ${this.p.name(d.node)}`);
    else if (d.mode === 'screen' && d.moved) {
      d.f.screen.editor_posx = Math.round(d.f.x / this.k + (this.origin?.x || 0));
      d.f.screen.editor_posy = Math.round(d.f.y / this.k + (this.origin?.y || 0));
      this.app.commit(`Move screen ${this.p.name(d.f.screen)}`, null, { canvas: false });
    } else if (d.mode === 'marquee') this.app.select(this.app.selection);
    this.drawOverlay();
  }

  /** Snap box edges (fractions of w/h listed in edges) to parent/sibling/screen lines. */
  snap(node, b, edges) {
    const f = this.frameOf(node);
    const thr = 5 / this.zoom;
    const xs = [], ys = [];
    const addBox = (r, kind) => {
      xs.push({ v: r.x, r }, { v: r.x + r.w / 2, r }, { v: r.x + r.w, r });
      ys.push({ v: r.y, r }, { v: r.y + r.h / 2, r }, { v: r.y + r.h, r });
    };
    addBox({ x: 0, y: 0, w: this.p.width, h: this.p.height });
    const par = this.p.parent(node);
    const m = this.meta(node);
    if (par && par.saved_objtypeKey !== 'SCREEN' && m) {
      const o = this.contentOrigin(node);
      addBox({ x: o.x, y: o.y, w: m.parentCtx.cw, h: m.parentCtx.ch });
      const pb = this.localBox(par); if (pb) addBox(pb);
    }
    const moving = new Set(this.app.selection);
    for (const sib of par?.children || []) {
      if (sib === node || moving.has(sib.guid) || this.p.isHidden(sib)) continue;
      const sb = this.localBox(sib); if (sb) addBox(sb);
    }
    const best = (cands, pos, size, fr) => {
      let bestD = null;
      for (const e of fr) for (const c of cands) {
        const dd = c.v - (pos + size * e);
        if (Math.abs(dd) <= thr && (bestD == null || Math.abs(dd) < Math.abs(bestD.d))) bestD = { d: dd, c };
      }
      return bestD;
    };
    const sx = best(xs, b.x, b.w, edges.x), sy = best(ys, b.y, b.h, edges.y);
    const dx = sx ? Math.round(sx.d) : 0, dy = sy ? Math.round(sy.d) : 0;
    const nb = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
    if (sx) { const r = sx.c.r; this.guides.push({ f, axis: 'x', v: sx.c.v, from: Math.min(r.y, nb.y) - 4, to: Math.max(r.y + r.h, nb.y + nb.h) + 4 }); }
    if (sy) { const r = sy.c.r; this.guides.push({ f, axis: 'y', v: sy.c.v, from: Math.min(r.x, nb.x) - 4, to: Math.max(r.x + r.w, nb.x + nb.w) + 4 }); }
    return { dx, dy };
  }

  onWheel(e) {
    if (!this.p) return;
    e.preventDefault();
    const pt = this.eventPoint(e);
    const trackpadPan = !e.ctrlKey && !e.metaKey && (e.deltaX !== 0 || (Math.abs(e.deltaY) < 40 && !Number.isInteger(e.deltaY)));
    if (trackpadPan || e.shiftKey) {
      this.pan.x -= e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX; this.pan.y -= e.shiftKey ? 0 : e.deltaY;
      this.applyTransform();
      return;
    }
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    this.zoomAt(this.zoom * factor, pt);
  }

  zoomAt(z, pt) {
    z = Math.max(0.05, Math.min(16, z));
    pt ||= { x: this.vp.clientWidth / 2, y: this.vp.clientHeight / 2 };
    const w = this.toWorld(pt);
    this.zoom = z;
    this.pan = { x: pt.x - w.x * z, y: pt.y - w.y * z };
    this.applyTransform();
  }
  zoomStep(dir) {
    const steps = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16];
    const z = dir > 0 ? steps.find((s) => s > this.zoom + 1e-3) ?? 16 : [...steps].reverse().find((s) => s < this.zoom - 1e-3) ?? 0.1;
    this.zoomAt(z);
  }

  fitRect(x, y, w, h, maxZoom = 4) {
    const vw = this.vp.clientWidth, vh = this.vp.clientHeight;
    if (!vw || !vh) return;
    const z = Math.min(maxZoom, (vw - 80) / w, (vh - 90) / h);
    this.zoom = Math.max(0.05, z);
    this.pan = { x: (vw - w * this.zoom) / 2 - x * this.zoom, y: (vh - h * this.zoom) / 2 - y * this.zoom + 10 };
    this.applyTransform();
  }
  fitScreen(guid = this.app.currentScreen) {
    const f = this.frames.get(guid); if (!f) return;
    this.fitRect(f.x, f.y - HEADER_H / this.zoom, this.p.width, this.p.height + HEADER_H / this.zoom, 3);
  }
  fitAll() {
    if (!this.frames.size) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const f of this.frames.values()) { x0 = Math.min(x0, f.x); y0 = Math.min(y0, f.y - HEADER_H); x1 = Math.max(x1, f.x + this.p.width); y1 = Math.max(y1, f.y + this.p.height); }
    this.fitRect(x0, y0, x1 - x0, y1 - y0, 2);
  }
  /** Scroll so the frame of the screen is visible (keep zoom). */
  revealScreen(guid) {
    const f = this.frames.get(guid); if (!f) return;
    const a = this.toView(f, 0, 0), vw = this.vp.clientWidth, vh = this.vp.clientHeight;
    const w = this.p.width * this.zoom, hh = this.p.height * this.zoom;
    if (a.x < 0 || a.y < 30 || a.x + w > vw || a.y + hh > vh) {
      if (w > vw - 40 || hh > vh - 60) this.fitScreen(guid);
      else { this.pan.x += (vw - w) / 2 - a.x; this.pan.y += (vh - hh) / 2 - a.y; this.applyTransform(); }
    }
  }

}

export function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
