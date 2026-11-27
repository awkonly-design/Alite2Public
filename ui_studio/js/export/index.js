// UI code export entry point. Runs in the browser and in Node.
import { exportLvgl8 } from './lvgl8.js';

const dec = new TextDecoder();

/**
 * Generate the LVGL C sources for a project.
 * @param {object} data parsed project JSON
 * @param {{readFile:(rel:string)=>Promise<Uint8Array|null>, listFiles:()=>Promise<string[]>, allAssetImages?:boolean, projectName?:string}} opts
 *   readFile reads project-relative files (images, fonts); listFiles lists assets/
 * @returns {Promise<{files:Object<string,string>, warnings:string[]}>}  file contents keyed by export-relative path
 */
export async function exportUI(data, opts) {
  const v = String(data?.info?.lvgl_version || '8.3.11');
  if (!v.startsWith('8.') && !v.startsWith('9.')) throw new Error(`LVGL ${v} projects are not supported (LVGL 8.x / 9.x only)`);
  const naming = data?.info?.naming;
  if (naming && naming !== 'Name' && naming !== '_Screen_Widget_Name') throw new Error(`Unsupported naming option "${naming}"`);
  const safeRead = async (rel) => {
    const r = String(rel).replace(/\\/g, '/');
    if (r.startsWith('/') || r.split('/').includes('..')) return null; // stay inside the project folder
    try { return await opts.readFile(r); } catch { return null; }
  };
  const { files, warnings } = await exportLvgl8(data, { ...opts, readFile: safeRead });
  for (const k of Object.keys(files)) if (typeof files[k] !== 'string') files[k] = dec.decode(files[k]);
  return { files, warnings };
}
