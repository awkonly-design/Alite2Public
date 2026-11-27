// Turns the exported file set into the flat layout of the Arduino sketch (src/Alite2):
// every file sits next to the .ino, so "screens/" and "images/" folders and "../ui.h" includes go away.
// Only files the firmware compiles are kept (no CMake lists, no event stubs: the events live in the .ino files).

const KEEP = /^(ui\.(c|h)|ui_helpers\.(c|h)|ui_events\.h|screens\/ui_[\w]+\.(c|h)|images\/ui_img_[\w]+\.c|fonts\/ui_font_[\w]+\.c)$/;

/** @param {Object<string,string>} files export-relative path -> content  @returns {Object<string,string>} flat file name -> content */
export function toSketchLayout(files) {
  const out = {};
  for (const [rel, content] of Object.entries(files)) {
    if (!KEEP.test(rel)) continue;
    const name = rel.split('/').pop();
    let text = String(content).replace(/#include "\.\.\/ui\.h"/g, '#include "ui.h"');
    if (name === 'ui.h') text = text.replace(/#include "screens\//g, '#include "');
    out[name] = text;
  }
  return out;
}

/** Names of the generated files that may be overwritten in the sketch folder. */
export const isSketchUiFile = (name) => /^(ui\.(c|h)|ui_helpers\.(c|h)|ui_events\.h|ui_[\w]+\.(c|h)|ui_img_[\w]+\.c|ui_font_[\w]+\.c)$/.test(name);
