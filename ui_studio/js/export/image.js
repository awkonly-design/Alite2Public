// PNG → LVGL 8 C image source (the "SOURCE" image export).
import { decodePng } from './png.js';

/**
 * Image variables are named after the path inside assets/: assets/anim/My Logo.png -> ui_img_anim_my_logo_png.
 * A path with any other character than letters, digits, space, "_", "." and "/" (chevron-1.png, p(1).png) gets
 * ui_img_<|hash|> instead, hash being .NET's (64 bit, non-randomized) String.GetHashCode of "assets/<path>".
 */
export function imageVarName(assetPath) {
  const rel = String(assetPath).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^assets\//, '');
  if (/[^A-Za-z0-9 _./]/.test(rel)) return 'ui_img_' + Math.abs(netStringHash('assets/' + rel));
  return 'ui_img_' + rel.toLowerCase().replace(/[^a-z0-9]/g, '_');
}
function netStringHash(s) {
  let h1 = 5381, h2 = 5381;
  for (let i = 0; i < s.length; i += 2) {
    h1 = (((h1 << 5) + h1) ^ s.charCodeAt(i)) >>> 0;
    if (i + 1 < s.length) h2 = (((h2 << 5) + h2) ^ s.charCodeAt(i + 1)) >>> 0;
  }
  return (h1 + Math.imul(h2, 1566083941)) | 0;
}

const HEX = Array.from({ length: 256 }, (_, v) => '0x' + v.toString(16).toUpperCase().padStart(2, '0') + ',');

/**
 * Convert RGBA pixels to the LVGL 8 byte layout for the project colour depth.
 * 16 bit: RGB565 little endian (+ alpha byte); 32 bit: B,G,R,A; 8 bit: RGB332 (+ alpha).
 */
export function pixelsToLvgl8(rgba, width, height, depth = 16, swap16 = false) {
  let alpha = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) { alpha = true; break; }
  const n = width * height;
  const px = depth === 32 ? 4 : depth === 8 ? (alpha ? 2 : 1) : (alpha ? 3 : 2);
  const out = new Uint8Array(n * px);
  for (let i = 0, o = 0; i < n; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3];
    if (depth === 32) { out[o++] = b; out[o++] = g; out[o++] = r; out[o++] = alpha ? a : 255; continue; }
    if (depth === 8) { out[o++] = (r & 0xe0) | ((g >> 3) & 0x1c) | (b >> 6); if (alpha) out[o++] = a; continue; }
    const c = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    if (swap16) { out[o++] = c >> 8; out[o++] = c & 255; } else { out[o++] = c & 255; out[o++] = c >> 8; }
    if (alpha) out[o++] = a;
  }
  return { bytes: out, alpha, bytesPerPixel: px };
}

/** Text of images/ui_img_xxx.c */
/** prefix: the project's "imagebytearrayprefix" (e.g. an attribute); when the setting exists it is written between [] and = */
export async function imageSource8(header, assetPath, pngBytes, depth = 16, swap16 = false, prefix = null) {
  const { width, height, rgba } = await decodePng(pngBytes);
  const name = imageVarName(assetPath);
  const { bytes, alpha, bytesPerPixel } = pixelsToLvgl8(rgba, width, height, depth, swap16);
  const perLine = 64 * bytesPerPixel;
  const lines = [];
  for (let i = 0; i < bytes.length; i += perLine) {
    let l = '';
    const end = Math.min(bytes.length, i + perLine);
    for (let j = i; j < end; j++) l += HEX[bytes[j]];
    lines.push(l);
  }
  // a full last line is still followed by the line break + indent
  const data = lines.join('\n    ') + (bytes.length && bytes.length % perLine === 0 ? '\n    ' : '');
  return `${header}
#include "../ui.h"

#ifndef LV_ATTRIBUTE_MEM_ALIGN
#define LV_ATTRIBUTE_MEM_ALIGN
#endif

// IMAGE DATA: ${String(assetPath).replace(/[\r\n]+/g, ' ')}
const LV_ATTRIBUTE_MEM_ALIGN uint8_t ${name}_data[]${typeof prefix === 'string' ? ` ${prefix} ` : ' '}= {
${data}};
const lv_img_dsc_t ${name} = {
   .header.always_zero = 0,
   .header.w = ${width},
   .header.h = ${height},
   .data_size = sizeof(${name}_data),
   .header.cf = ${alpha ? 'LV_IMG_CF_TRUE_COLOR_ALPHA' : 'LV_IMG_CF_TRUE_COLOR'},
   .data = ${name}_data};

`;
}

/**
 * Text of images/ui_img_xxx.c for LVGL 9. 16 bit with alpha is RGB565A8: the colour plane, then the alpha plane;
 * 32 bit is B,G,R,A. Both are written 64 pixels per line.
 */
export async function imageSource9(header, assetPath, pngBytes, depth = 16, prefix = null) {
  const { width, height, rgba } = await decodePng(pngBytes);
  const name = imageVarName(assetPath);
  const n = width * height;
  let alpha = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) { alpha = true; break; }
  const planes = [];
  if (depth === 32) {
    const out = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { out[i * 4] = rgba[i * 4 + 2]; out[i * 4 + 1] = rgba[i * 4 + 1]; out[i * 4 + 2] = rgba[i * 4]; out[i * 4 + 3] = alpha ? rgba[i * 4 + 3] : 255; }
    planes.push([out, 64 * 4]);
  } else {
    const col = new Uint8Array(n * 2);
    for (let i = 0; i < n; i++) {
      const c = ((rgba[i * 4] >> 3) << 11) | ((rgba[i * 4 + 1] >> 2) << 5) | (rgba[i * 4 + 2] >> 3);
      col[i * 2] = c & 255; col[i * 2 + 1] = c >> 8;
    }
    planes.push([col, 64 * 2]);
    if (alpha) { const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = rgba[i * 4 + 3]; planes.push([a, 64]); }
  }
  const text = planes.map(([bytes, perLine]) => {
    const lines = [];
    for (let i = 0; i < bytes.length; i += perLine) {
      let l = '';
      const end = Math.min(bytes.length, i + perLine);
      for (let j = i; j < end; j++) l += HEX[bytes[j]];
      lines.push(l);
    }
    return lines.join('\n    ') + (bytes.length && bytes.length % perLine === 0 ? '\n    ' : '');
  });
  const data = text.join('\n    //alpha channel data:\n    ');
  return `${header}
#include "../ui.h"

#ifndef LV_ATTRIBUTE_MEM_ALIGN
#define LV_ATTRIBUTE_MEM_ALIGN
#endif

// IMAGE DATA: ${String(assetPath).replace(/[\r\n]+/g, ' ')}
const LV_ATTRIBUTE_MEM_ALIGN uint8_t ${name}_data[]${typeof prefix === 'string' ? ` ${prefix} ` : ' '}= {
${data}};
const lv_image_dsc_t ${name} = {
   .header.w = ${width},
   .header.h = ${height},
   .data_size = sizeof(${name}_data),
   .header.cf = ${alpha ? 'LV_COLOR_FORMAT_NATIVE_WITH_ALPHA' : 'LV_COLOR_FORMAT_NATIVE'},
   .header.magic = LV_IMAGE_HEADER_MAGIC,
   .data = ${name}_data};

`;
}
