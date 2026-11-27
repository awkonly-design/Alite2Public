// Project asset store: maps project-relative paths (e.g. "assets/logo.png") to object URLs.
const IMG_RE = /\.(png|jpe?g|gif|bmp|svg|webp)$/i;
const SKIP_DIRS = new Set(['backup', 'cache', 'autosave', 'export', 'node_modules', '.git']);

export class Assets {
  constructor(onChange) {
    this.items = new Map(); // relPath -> { name, path, file, url, w, h }
    this.onChange = onChange;
    this._t = null;
  }
  clear() {
    for (const it of this.items.values()) URL.revokeObjectURL(it.url);
    this.items.clear();
  }
  static isImage(name) { return IMG_RE.test(name); }
  static skipDir(name) { return SKIP_DIRS.has(name.toLowerCase()); }

  add(path, file) {
    path = path.replace(/\\/g, '/').replace(/^\.\//, '');
    const old = this.items.get(path);
    if (old) URL.revokeObjectURL(old.url);
    const it = { name: path.split('/').pop(), path, file, url: URL.createObjectURL(file), w: null, h: null };
    this.items.set(path, it);
    const im = new Image();
    im.onload = () => { it.w = im.naturalWidth; it.h = im.naturalHeight; this.changed(); };
    im.src = it.url;
    return it;
  }
  changed() { clearTimeout(this._t); this._t = setTimeout(() => this.onChange?.(), 30); }

  find(path) {
    if (!path) return null;
    const p = path.replace(/\\/g, '/').replace(/^\.\//, '');
    if (this.items.has(p)) return this.items.get(p);
    const base = p.split('/').pop().toLowerCase();
    for (const it of this.items.values()) if (it.name.toLowerCase() === base) return it;
    return null;
  }
  url(path) { return this.find(path)?.url || null; }
  image(path) { const it = this.find(path); return it && it.w != null ? { w: it.w, h: it.h } : null; }
  list() { return [...this.items.values()].sort((a, b) => a.path.localeCompare(b.path)); }
}
