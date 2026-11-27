// Protected screens: QrScreen carries the product's regulatory information (model, distributor, manufacturer,
// certification mark, app / manual QR codes). It is locked in the editor, and export_ui / Build refuse to export the
// UI when the screen (widgets, texts, images and the PNG files they use) differs from the approved version.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const PROTECTED_SCREEN = 'QrScreen';
const APPROVED = '94d3749909a55b6d3ed45a552a2ee3781949a3818bb2942a25369c096faf0cf8';

const norm = (v) => (Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k])])) : v);
const nameOf = (n) => (n.properties || []).find((p) => /\/Name$/.test(p.strtype || ''))?.strval;

/** Fingerprint of the protected screen in project `data`; null if the screen is missing. */
export async function protectedFingerprint(data, projectDir) {
  const screen = (data?.root?.children || []).find((s) => nameOf(s) === PROTECTED_SCREEN);
  if (!screen) return null;
  const assets = new Set();
  const shape = (n) => {
    for (const p of n.properties || []) if (typeof p.strval === 'string' && /\.png$/i.test(p.strval)) assets.add(p.strval);
    for (const c of n.children || []) shape(c);
    return { t: n.saved_objtypeKey, l: !!n.locked, p: norm(n.properties || []), c: (n.children || []).map(shape) };
  };
  const h = crypto.createHash('sha256').update(JSON.stringify(shape(screen)));
  for (const a of [...assets].sort()) {
    let buf = Buffer.alloc(0);
    try { buf = await fs.readFile(path.resolve(projectDir, a)); } catch { /* missing file changes the fingerprint */ }
    h.update(a).update(crypto.createHash('sha256').update(buf).digest());
  }
  return h.digest('hex');
}

/** Throws when the protected screen was changed. */
export async function checkProtected(data, projectDir) {
  const fp = await protectedFingerprint(data, projectDir);
  if (fp !== APPROVED) {
    throw new Error(`${PROTECTED_SCREEN} must not be changed: it shows the product's model, manufacturer and certification information. Undo the changes to ${PROTECTED_SCREEN} (Ctrl+Z, or restore ui_studio/project/alite2_ui.json and its PNG files) and export again.`);
  }
}
