// Minimal PNG decoder (all colour types, bit depths 1-16, Adam7) → RGBA8.
// Uses DecompressionStream, so it runs unchanged in the browser and in Node 18+.

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate');
  const out = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export function isPng(bytes) { return bytes.length > 8 && SIG.every((v, i) => bytes[i] === v); }

/** @returns {Promise<{width:number,height:number,rgba:Uint8Array}>} */
export async function decodePng(bytes) {
  if (!isPng(bytes)) throw new Error('Not a PNG file');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  let palette = null, trns = null;
  const idat = [];
  while (pos + 8 <= bytes.length) {
    const len = dv.getUint32(pos); const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
      w = d.getUint32(0); h = d.getUint32(4); depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  const total = idat.reduce((a, b) => a + b.length, 0);
  const comp = new Uint8Array(total);
  let o = 0; for (const c of idat) { comp.set(c, o); o += c.length; }
  const raw = await inflate(comp);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!channels) throw new Error('Unsupported PNG colour type: ' + ctype);
  const bpp = Math.max(1, (channels * depth) >> 3); // bytes per pixel for filtering
  const rgba = new Uint8Array(w * h * 4);
  const maxv = (1 << depth) - 1;
  const trnsKey = trns && (ctype === 0 || ctype === 2) ? (ctype === 0 ? [(trns[0] << 8) | trns[1]] : [(trns[0] << 8) | trns[1], (trns[2] << 8) | trns[3], (trns[4] << 8) | trns[5]]) : null;

  let rp = 0;
  const pass = (x0, y0, dx, dy) => {
    const pw = Math.ceil((w - x0) / dx), ph = Math.ceil((h - y0) / dy);
    if (pw <= 0 || ph <= 0) return;
    const stride = Math.ceil((pw * channels * depth) / 8);
    let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
    for (let y = 0; y < ph; y++) {
      const f = raw[rp++];
      cur.set(raw.subarray(rp, rp + stride)); rp += stride;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
        let v = cur[i];
        if (f === 1) v += a;
        else if (f === 2) v += b;
        else if (f === 3) v += (a + b) >> 1;
        else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        cur[i] = v & 255;
      }
      const sample = (idx) => { // idx = sample index within row
        if (depth === 8) return cur[idx];
        if (depth === 16) return (cur[idx * 2] << 8) | cur[idx * 2 + 1];
        const bit = idx * depth, byte = cur[bit >> 3], shift = 8 - depth - (bit & 7);
        return (byte >> shift) & maxv;
      };
      const to8 = (v) => (depth === 16 ? v >> 8 : depth === 8 ? v : Math.round((v * 255) / maxv));
      for (let x = 0; x < pw; x++) {
        const di = (((y0 + y * dy) * w) + x0 + x * dx) * 4;
        let r, g, bb, al = 255;
        if (ctype === 3) {
          const ix = sample(x); r = palette[ix * 3]; g = palette[ix * 3 + 1]; bb = palette[ix * 3 + 2];
          if (trns && ix < trns.length) al = trns[ix];
        } else if (ctype === 0 || ctype === 4) {
          const s = sample(x * channels); r = g = bb = to8(s);
          if (ctype === 4) al = to8(sample(x * channels + 1));
          else if (trnsKey && s === trnsKey[0]) al = 0;
        } else {
          const sr = sample(x * channels), sg = sample(x * channels + 1), sb = sample(x * channels + 2);
          r = to8(sr); g = to8(sg); bb = to8(sb);
          if (ctype === 6) al = to8(sample(x * channels + 3));
          else if (trnsKey && sr === trnsKey[0] && sg === trnsKey[1] && sb === trnsKey[2]) al = 0;
        }
        rgba[di] = r; rgba[di + 1] = g; rgba[di + 2] = bb; rgba[di + 3] = al;
      }
      [prev, cur] = [cur, prev];
    }
  };
  if (interlace) {
    for (const [x0, y0, dx, dy] of [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]) pass(x0, y0, dx, dy);
  } else pass(0, 0, 1, 1);
  return { width: w, height: h, rgba };
}
