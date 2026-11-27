// LVGL C code export for LVGL 8.3 projects.
//
// Produces this file set:
//   ui.h ui.c ui_helpers.h ui_helpers.c ui_events.h [ui_events.c] CMakeLists.txt filelist.txt project.info
//   screens/ui_<Screen>.c/.h  images/ui_img_*.c  fonts/ui_font_*.c  components/ui_comp_hook.c
//
// Input is the parsed project JSON; images and fonts are read through the `readFile(relPath)` callback.
import * as H8 from './helpers8.js';
import * as H9 from './helpers9.js';
import { imageSource8, imageSource9, imageVarName } from './image.js';

/**
 * LVGL 9: the same code is written with the renamed API. Applied to the generated files at the end
 * (not to the static helper files, images and fonts, which have their own LVGL 9 versions).
 */
const API9 = {
  lv_obj_clear_flag: 'lv_obj_remove_flag', lv_obj_clear_state: 'lv_obj_remove_state',
  lv_img_create: 'lv_image_create', lv_img_set_src: 'lv_image_set_src', lv_img_set_pivot: 'lv_image_set_pivot',
  lv_img_set_angle: 'lv_image_set_rotation', lv_img_get_angle: 'lv_image_get_rotation',
  lv_img_set_zoom: 'lv_image_set_scale', lv_img_get_zoom: 'lv_image_get_scale', lv_img_dsc_t: 'lv_image_dsc_t',
  lv_imgbtn_create: 'lv_imagebutton_create', lv_imgbtn_set_src: 'lv_imagebutton_set_src',
  LV_IMGBTN_STATE_RELEASED: 'LV_IMAGEBUTTON_STATE_RELEASED', LV_IMGBTN_STATE_PRESSED: 'LV_IMAGEBUTTON_STATE_PRESSED',
  LV_IMGBTN_STATE_DISABLED: 'LV_IMAGEBUTTON_STATE_DISABLED', LV_IMGBTN_STATE_CHECKED_RELEASED: 'LV_IMAGEBUTTON_STATE_CHECKED_RELEASED',
  LV_IMGBTN_STATE_CHECKED_PRESSED: 'LV_IMAGEBUTTON_STATE_CHECKED_PRESSED', LV_IMGBTN_STATE_CHECKED_DISABLED: 'LV_IMAGEBUTTON_STATE_CHECKED_DISABLED',
  lv_btn_create: 'lv_button_create',
  lv_obj_set_style_bg_img_src: 'lv_obj_set_style_bg_image_src', lv_obj_set_style_bg_img_opa: 'lv_obj_set_style_bg_image_opa',
  lv_obj_set_style_bg_img_tiled: 'lv_obj_set_style_bg_image_tiled', lv_obj_set_style_bg_img_recolor: 'lv_obj_set_style_bg_image_recolor',
  lv_obj_set_style_bg_img_recolor_opa: 'lv_obj_set_style_bg_image_recolor_opa',
  lv_obj_set_style_img_recolor: 'lv_obj_set_style_image_recolor', lv_obj_set_style_img_recolor_opa: 'lv_obj_set_style_image_recolor_opa',
  lv_obj_set_style_img_opa: 'lv_obj_set_style_image_opa',
  lv_obj_set_style_shadow_ofs_x: 'lv_obj_set_style_shadow_offset_x', lv_obj_set_style_shadow_ofs_y: 'lv_obj_set_style_shadow_offset_y',
  lv_obj_set_style_arc_img_src: 'lv_obj_set_style_arc_image_src',
  lv_mem_alloc: 'lv_malloc', lv_mem_free: 'lv_free', lv_indev_get_act: 'lv_indev_active', lv_event_send: 'lv_obj_send_event',
  lv_scr_load_anim_t: 'lv_screen_load_anim_t', lv_scr_load_anim: 'lv_screen_load_anim',
  lv_disp_get_default: 'lv_display_get_default', lv_theme_basic_init: 'lv_theme_simple_init',
  LV_STYLE_BG_IMG_RECOLOR: 'LV_STYLE_BG_IMAGE_RECOLOR', LV_STYLE_BG_IMG_RECOLOR_OPA: 'LV_STYLE_BG_IMAGE_RECOLOR_OPA',
  LV_STYLE_IMG_RECOLOR: 'LV_STYLE_IMAGE_RECOLOR', LV_STYLE_IMG_RECOLOR_OPA: 'LV_STYLE_IMAGE_RECOLOR_OPA',
};
const API9_RE = new RegExp(`\\b(${Object.keys(API9).join('|')})\\b`, 'g');
const api9 = (text) => text.replace(API9_RE, (m) => API9[m]);

// ---------------------------------------------------------------- project access
const key = (p) => { const i = p.strtype.indexOf('/'); return i < 0 ? p.strtype : p.strtype.slice(i + 1); };
const kids = (n) => n.children || [];
const T = (n) => n.saved_objtypeKey;
function prop(n, k) {
  let found;
  for (const p of n.properties || []) {
    if (key(p) !== k) continue;
    if (p.strtype.startsWith(T(n) + '/')) return p;
    found ||= p;
  }
  return found;
}
const str = (n, k, d = '') => { const p = prop(n, k); return p && p.strval != null ? p.strval : d; };
const int = (n, k, d = 0) => { const p = prop(n, k); return p ? (p.integer ?? 0) : d; };
const arr = (n, k, d = null) => { const p = prop(n, k); return p && Array.isArray(p.intarray) ? p.intarray : d; };
const bool = (n, k, d) => { const p = prop(n, k); return p && p.strval != null ? p.strval === 'True' : d; };
const childProp = (p, k) => (p.childs || []).find((c) => key(c) === k);
// Older component files store InheritedType and layout values as names
const IT_NAMES = { PropertyBlock: 1, PropertyBool: 2, PropertyChoice: 3, PropertyEvent: 4, PropertyImage: 5, PropertyInt: 6, PropertyIntArray: 7, PropertyAnimation: 8, PropertyObject: 9, PropertyString: 10, PropertyStyle: 11, PropertyChartData: 12, PropertyLayout: 13, PropertyImageSet: 14 };
const LAYOUT_NAMES = { None: 0, Flex: 1, Row: 0, Column: 1, Start: 0, Center: 1, End: 2, Space_Between: 3, Space_Around: 4, Space_Evenly: 5 };
function normalizeProps(n) {
  const fix = (p) => {
    if (typeof p.InheritedType === 'string') p.InheritedType = IT_NAMES[p.InheritedType] ?? 0;
    for (const k of ['Flow', 'LayoutType', 'MainAlignment', 'CrossAlignment', 'TrackAlignment']) if (typeof p[k] === 'string') p[k] = LAYOUT_NAMES[p[k]] ?? 0;
    // older files: "BUTTON/EventHandler" with a "_custom/action"
    if (/^[A-Z_]+\/EventHandler$/.test(p.strtype || '')) p.strtype = '_event/EventHandler';
    if (p.strtype === '_custom/action') p.strtype = '_event/action';
    (p.childs || []).forEach(fix);
  };
  (n.properties || []).forEach(fix);
  kids(n).forEach(normalizeProps);
}
/** lv_obj_set_x/y lines; like sizes, a pixel coordinate is written before a percentage */
function posLines(v, x, y, ux, uy) {
  const lx = `lv_obj_set_x( ${v}, ${ux === 2 ? `lv_pct(${x})` : x} );`, ly = `lv_obj_set_y( ${v}, ${uy === 2 ? `lv_pct(${y})` : y} );`;
  return ux !== 1 && uy === 1 ? [ly, lx] : [lx, ly];
}
/** property flags; older component files store them as "mode" */
const pflags = (p) => (p ? (p.flags ?? p.mode ?? 0) : 0);
/** changed in a component instance: flag 0x10000/0x20000, or "compmode" in older component files */
const overridden = (p) => !!((pflags(p) & 0x30000) || p.compmode);

/** C identifier for a widget name (ui_<Name>, invalid characters become "_") */
const cname = (name) => 'ui_' + cid(name);
const cid = (name) => String(name).replace(/[^A-Za-z0-9_]/g, '_');
/** type part of a variable name in the "_Screen_Widget_Name" naming: LABEL -> Label, IMGBUTTON -> Imgbutton */
const typeLabel = (t) => t[0] + t.slice(1).toLowerCase();
// project text is already C-escaped (\n, \"); only a bare quote typed in another editor still needs escaping
// Text for a C string literal. Texts keep their escape sequences (\n, \t, \", \\ ...); stray backslashes, quotes,
// raw line breaks and control characters are escaped, so a text can never end the literal and add code.
const cstr = (s) => {
  const t = String(s ?? '');
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\') {
      const n = t[i + 1];
      if (n !== undefined && 'ntr\\"\'?0abfv'.includes(n)) { out += c + n; i++; } else out += '\\\\';
    } else if (c === '"') out += '\\"';
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c < ' ' || c === '\x7f') out += '\\' + c.charCodeAt(0).toString(8).padStart(3, '0');
    else out += c;
  }
  return out;
};
// Text for a // comment: one line, no comment terminator.
const ccomment = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/\*\//g, '* /');
const hex6 = (c) => '0x' + c.slice(0, 3).map((v) => (v & 255).toString(16).toUpperCase().padStart(2, '0')).join('');
// lvgl_include_path of common boards (used when the project leaves it empty)
const BOARD_INCLUDE = { 'CMake/Eclipse/VScode with SDL for development on PC': 'lvgl/lvgl.h', 'Eclipse with SDL for development on PC': 'lvgl/lvgl.h', 'VS Code with SDL for development on PC': 'lvgl/lvgl.h' };
const PALETTE = ['RED', 'PINK', 'PURPLE', 'DEEP_PURPLE', 'INDIGO', 'BLUE', 'LIGHT_BLUE', 'CYAN', 'TEAL', 'GREEN', 'LIGHT_GREEN', 'LIME', 'YELLOW', 'AMBER', 'ORANGE', 'DEEP_ORANGE', 'BROWN', 'BLUE_GREY', 'GREY'];

// ---------------------------------------------------------------- flags
// [prop name, LV flag, value when the prop is absent], in the order they are listed (and ORed).
const FLAGS = [
  ['Hidden', 'HIDDEN', false], ['Clickable', 'CLICKABLE', true], ['Checkable', 'CHECKABLE', false], ['Press_lock', 'PRESS_LOCK', true],
  ['Click_focusable', 'CLICK_FOCUSABLE', true], ['Adv_hittest', 'ADV_HITTEST', false], ['Ignore_layout', 'IGNORE_LAYOUT', false],
  ['Floating', 'FLOATING', false], ['Overflow_visible', 'OVERFLOW_VISIBLE', false], ['Flex_in_new_track', 'FLEX_IN_NEW_TRACK', false],
  ['Event_bubble', 'EVENT_BUBBLE', false], ['Gesture_bubble', 'GESTURE_BUBBLE', true], ['Snappable', 'SNAPPABLE', true],
  ['Scrollable', 'SCROLLABLE', true], ['Scroll_elastic', 'SCROLL_ELASTIC', true], ['Scroll_momentum', 'SCROLL_MOMENTUM', true],
  ['Scroll_on_focus', 'SCROLL_ON_FOCUS', false], ['Scroll_chain', 'SCROLL_CHAIN', true], ['Scroll_with_arrow', 'SCROLL_WITH_ARROW', false],
  ['Scroll_one', 'SCROLL_ONE', false],
];
// Flag values assumed for a widget type when the project has no property for them (instead of the lv_obj default)
const ABSENT = { CHART: { Scroll_elastic: false } };
// Where the LVGL widget's own default differs from a plain lv_obj .
const LV_DEFAULT = {
  LABEL: { Clickable: false }, IMAGE: { Clickable: false }, BAR: { Clickable: false }, CHART: { Scrollable: false, Scroll_elastic: false },
};
const STATES = [['Checked', 'CHECKED'], ['Disabled', 'DISABLED'], ['Pressed', 'PRESSED'], ['Focused', 'FOCUSED'], ['Edited', 'EDITED'], ['User_1', 'USER_1'], ['User_2', 'USER_2'], ['User_3', 'USER_3'], ['User_4', 'USER_4']];

// ---------------------------------------------------------------- styles
const PART = {
  'lv.PART.MAIN': 'LV_PART_MAIN', 'lv.PART.SCROLLBAR': 'LV_PART_SCROLLBAR', 'lv.PART.INDICATOR': 'LV_PART_INDICATOR', 'lv.PART.KNOB': 'LV_PART_KNOB',
  'lv.PART.SELECTED': 'LV_PART_SELECTED', 'lv.PART.ITEMS': 'LV_PART_ITEMS', 'lv.PART.TICKS': 'LV_PART_TICKS', 'lv.PART.CURSOR': 'LV_PART_CURSOR',
  'lv.PART_TEXTAREA.PLACEHOLDER': 'LV_PART_TEXTAREA_PLACEHOLDER', 'lv.PART.CUSTOM_FIRST': 'LV_PART_CUSTOM_FIRST',
};
// The style properties are written of a part group by group, in the group order of the part's
// descriptor ("lv.PART.MAIN, Text, Rectangle, Pad, Transform") and in this order inside each group.
const STYLE_GROUPS = {
  Rectangle: ['Bg_Radius', 'Bg_Color', 'Bg_gradiens_Color', 'Bg_gradient_params', 'Gradient direction', 'Clip_corner', 'Bg_Image', 'Bg_Image_opa', 'Bg_Image_Recolor', 'Bg_Image_Tiled',
    'Border_Color', 'Border width', 'Border side', 'Outline_Color', 'Outline_params', 'Shadow_Color', 'Shadow_params', 'Shadow_offset', 'Blend mode', 'Blend_opacity'],
  Pad: ['Padding', 'Padding_RowCol'],
  Text: ['Text_Color', 'Text_Spacing', 'Text_Align', 'Text_Decor', 'Text_Font'],
  Arc: ['Arc_Color', 'Arc_Width', 'Arc_Rounded', 'Arc_Image'],
  Line: ['Line_Color', 'Line_Width', 'Line_Rounded'],
  Image: ['Image_reColor'],
  Size: ['Size_size'],
};
/** "{...json with "c":"lv_dropdown_get_list({0})"} lv.PART.MAIN, Text, Rectangle" -> { sub, part, groups } */
function partDescriptor(sp) {
  let d = String(sp.strval || ''), sub = null;
  if (d.startsWith('{')) {
    const end = d.indexOf('} ');
    try { sub = JSON.parse(d.slice(0, end + 1)).c || null; } catch { sub = null; }
    d = d.slice(end + 2);
  }
  const [part, ...groups] = d.split(',').map((x) => x.trim()).filter(Boolean);
  return { sub, part: PART[(sp.part || part || '').trim()] || PART[part] || 'LV_PART_MAIN', groups };
}
const COLOR_STYLE = {
  Bg_Color: 'bg', Border_Color: 'border', Outline_Color: 'outline', Text_Color: 'text', Arc_Color: 'arc', Shadow_Color: 'shadow',
  Line_Color: 'line',
};
// colour styles whose setter has no "_color" suffix
const RECOLOR_STYLE = { Bg_Image_Recolor: 'bg_img_recolor', Image_reColor: 'img_recolor' };

/** Which project properties a generated widget line comes from (to keep only changed ones in component instances) */
const LINE_PROPS = {
  lv_label_set_text: ['Text'], lv_label_set_long_mode: ['Long_mode'], lv_label_set_recolor: ['Recolor'],
  lv_img_set_src: ['Asset'], lv_img_set_pivot: ['Pivot'], lv_img_set_angle: ['Rotation'], lv_img_set_zoom: ['Scale'],
  lv_arc_set_range: ['Range'], lv_arc_set_value: ['Value'], lv_arc_set_bg_angles: ['Bg_angles'], lv_arc_set_mode: ['Mode'], lv_arc_set_rotation: ['Rotation'],
  lv_bar_set_range: ['Range'], lv_bar_set_mode: ['Mode'], lv_bar_set_value: ['Value'], lv_bar_set_start_value: ['Value', 'Value_start'],
  lv_slider_set_range: ['Range'], lv_slider_set_mode: ['Mode'], lv_slider_set_value: ['Value'], if: ['Value', 'Value_left'],
  lv_roller_set_options: ['Options', 'Mode'], lv_roller_set_selected: ['Selected'],
  lv_dropdown_set_dir: ['List_align'], lv_dropdown_set_options: ['Options'], lv_dropdown_set_selected_highlight: ['Show_selected'], lv_dropdown_set_text: ['Base_text'],
  lv_checkbox_set_text: ['Title'],
  lv_textarea_set_accepted_chars: ['Accepted_characters'], lv_textarea_set_max_length: ['Max_text_length'], lv_textarea_set_text: ['Text'],
  lv_textarea_set_placeholder_text: ['Placeholder'], lv_textarea_set_one_line: ['One_line_mode'], lv_textarea_set_password_mode: ['Password_mode'],
  lv_keyboard_set_mode: ['Mode'], lv_spinbox_set_digit_format: ['Digit_format'], lv_spinbox_set_range: ['Range'], lv_spinbox_set_cursor_pos: ['Range'], lv_spinbox_set_value: ['Value'],
  lv_imgbtn_set_src: ['Image_released', 'Image_pressed', 'Image_disabled', 'Image_checked_pressed', 'Image_checked_released', 'Image_checked_disabled'],
};
function lineProps(type, line) {
  const fn = (/^(\w+)/.exec(line) || [])[1];
  if (type === 'CHART') return ['Chart_type', 'Number_of_points', 'Division_lines', 'Zoom', 'Primary_Y_range', 'Secondary_Y_range', 'XMajor', 'XMinor', 'Labels_on_X_axis', 'Font_size_on_X_axis', 'PrimaryYMajor', 'PrimaryYMinor', 'Labels_on_Primary_Y_axis', 'Font_size_on_Primary_Y_axis', 'SecondaryYMajor', 'SecondaryYMinor', 'Labels_on_Secondary_Y_axis', 'Font_size_on_Secondary_Y_axis', 'ChartData'];
  return LINE_PROPS[fn] || [];
}

/** "CLICKED", "CHECKED(VALUE_CHANGED)", "GESTURE_LEFT(GESTURE)" -> the C condition */
function eventCondition(code) {
  const m = /^(\w+)\((\w+)\)$/.exec(code || '');
  if (!m) return { cond: `event_code == LV_EVENT_${code}` };
  const [, sub, ev] = m;
  if (sub === 'CHECKED') return { cond: `event_code == LV_EVENT_${ev} &&  lv_obj_has_state(target,LV_STATE_CHECKED)  `, target: true };
  if (sub === 'UNCHECKED') return { cond: `event_code == LV_EVENT_${ev} &&  !lv_obj_has_state(target,LV_STATE_CHECKED)  `, target: true };
  const g = /^GESTURE_(LEFT|RIGHT|TOP|BOTTOM|UP|DOWN)$/.exec(sub);
  if (g) {
    const dir = { UP: 'TOP', DOWN: 'BOTTOM' }[g[1]] || g[1];
    return { cond: `event_code == LV_EVENT_${ev} &&  lv_indev_get_gesture_dir(lv_indev_get_act()) == LV_DIR_${dir}  `, pre: 'lv_indev_wait_release(lv_indev_get_act());\n' };
  }
  return { cond: `event_code == LV_EVENT_${ev}` };
}

class Gen {
  constructor(data, opts) {
    this.data = data;
    this.info = data.info || {};
    this.opts = opts;
    this.byGuid = new Map();
    this.warnings = [];
    this.images = [];        // asset paths in first-use order
    this.fonts = [];         // custom font names in first-use order
    this.functions = [];     // [name, exportStub]
    this.expr = new Map();   // node -> C expression (component definitions / instances)
    this.evNames = new Map(); // node -> event function suffix
    this.components = new Map(); // component root guid -> component
    // the project name is used in header guards
    this.v9 = String(this.info.lvgl_version || '').startsWith('9.');
    this.H = this.v9 ? H9 : H8;
    this.projectName = String(opts.projectName || this.info.name || this.info.Name || 'Alite2').replace(/\.json$/i, '');
    // project settings > naming: "Name" (ui_<Name>) or "_Screen_Widget_Name" (ui_<Screen>_<Type>_<Name>)
    this.naming = this.info.naming === '_Screen_Widget_Name';
    this.lower = !!this.info.naming_force_lowercase;
    this.subNaming = this.naming && this.info.naming_add_subcomponent !== false;
    this.screenOf = new Map();
    const walk = (n, scr) => { if (n.guid) this.byGuid.set(n.guid, n); if (T(n) === 'SCREEN') scr = n; this.screenOf.set(n, scr); kids(n).forEach((c) => walk(c, scr)); };
    walk(data.root, null);
  }

  warn(msg) { if (!this.warnings.includes(msg)) this.warnings.push(msg); }
  name(n) { return str(n, 'Name', T(n) === 'STARTEVENTS' ? '___initial_actions0' : T(n)); }
  low(s) { return this.lower ? s.toLowerCase() : s; }
  /** "Label" / "Panel", or the component name for a component instance */
  typeOf(n) { const c = n.cid && this.components.get(n.cid); return c ? cid(c.title) : typeLabel(T(n)); }
  /** variable name inside a component definition (cui_...), without the prefix */
  localName(n) { const nm = cid(str(n, 'Name', T(n))); return this.low(this.naming ? `${this.typeOf(n)}_${nm}` : nm); }
  /** variable name of a screen-level widget, without the ui_ prefix */
  sfx(n) {
    const nm = cid(this.name(n));
    if (!this.naming) return this.low(nm);
    if (T(n) === 'SCREEN') return this.low('Screen_' + nm);
    const scr = this.screenOf.get(n);
    return this.low(`${scr ? cid(this.name(scr)) + '_' : ''}${this.typeOf(n)}_${nm}`);
  }
  /** C expression of a widget: ui_<Name>, or cui_<Name> / ui_comp_get_child(...) inside components */
  v(n) { return this.expr.get(n) || 'ui_' + this.sfx(n); }
  /** suffix of the widget's event function name (ui_event_<suffix>) */
  evName(n) { return this.evNames.get(n) || this.v(n).slice(3); }
  ref(guid) {
    if (!guid || guid === '-') return 'NULL';
    const cn = this.inComp?.byGuid.get(guid);
    if (cn) return `comp_${this.inComp.id}[${this.inComp.constOf.get(cn)}]`;
    const n = this.byGuid.get(guid); if (!n) { if (guid) this.warn(`Reference not found: ${guid}`); return 'NULL'; } return this.v(n); }

  header() {
    return `// This file was generated by Alite2 Studio. Do not edit it by hand:\n// change the UI in ui_studio and export again.\n// LVGL version: ${ccomment(this.info.lvgl_version || '8.3.11')}\n// Project name: ${ccomment(this.projectName)}\n`;
  }

  /** References to image files that are not in the project are left out */
  hasImage(path) {
    path = String(path || '').replace(/\\/g, '/');
    if (!path || !this.assetFiles || this.assetFiles.has(path)) return !!path;
    this.warn(`Image file not found, reference left out: ${path}`);
    return false;
  }
  /** C name of the theme colour a colour property refers to (its "integer" is the colour's nid in themes.json, strval its name) */
  themeColor(c) {
    if (!this.themeColors?.length || (!c.integer && !c.strval)) return null;
    // older files keep only the colour's name in strval
    const tc = (c.integer && this.themeColors.find((x) => x.nid === c.integer)) || (c.strval && this.themeColors.find((x) => x.strval === c.strval));
    return tc ? this.low(cid(tc.strval)) : null;
  }
  /** themes.json: the default theme's colours (THEME_COLOR properties) */
  async loadThemes() {
    const bytes = await this.opts.readFile('themes.json');
    let t = null;
    try { t = bytes ? JSON.parse((typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes)).replace(/^\uFEFF/, '')) : null; } catch { this.warn('Cannot read themes.json'); }
    this.themeColors = (t?.deftheme?.properties || []).filter((p) => p.strtype === 'THEME_COLOR');
    this.themeName = t?.deftheme?.name || 'Default';
    if (this.themeColors.length && t?.themes?.length) this.warn('Only the default theme is exported');
  }
  themeFiles(H) {
    const cs = this.themeColors, n = (tc) => this.low(cid(tc.strval));
    const c = `${H}\n#include "ui.h"\n\n` + cs.map((tc) => `const ui_theme_variable_t _ui_theme_color_${n(tc)}[1] = {${hex6(tc.intarray || [0, 0, 0])}};\nconst ui_theme_variable_t _ui_theme_alpha_${n(tc)}[1] = {${(tc.intarray || [])[3] ?? 255}};\n`).join('\n')
      + `uint8_t ui_theme_idx = UI_THEME_DEFAULT;\n\nvoid ui_theme_set(uint8_t theme_idx)\n{\n    ui_theme_idx = theme_idx;\n    _ui_theme_set_variable_styles(UI_VARIABLE_STYLES_MODE_FOLLOW);\n}\n\n`;
    const h = `${H}\n#ifndef _UI_THEMES_H\n#define _UI_THEMES_H\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\n`
      + cs.map((tc, i) => `#define UI_THEME_COLOR_${n(tc).toUpperCase()} ${i}\n`).join('')
      + `\n#define UI_THEME_${cid(this.themeName).toUpperCase()} 0\n\n`
      + cs.map((tc) => `extern const ui_theme_variable_t _ui_theme_color_${n(tc)}[1];\nextern const ui_theme_variable_t _ui_theme_alpha_${n(tc)}[1];\n\n`).join('')
      + `extern const uint32_t* ui_theme_colors[1];\nextern const uint8_t* ui_theme_alphas[1];\nextern uint8_t ui_theme_idx;\n\nvoid ui_theme_set(uint8_t theme_idx);\n\n#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n`;
    return { c, h };
  }
  useImage(path) { path = String(path || '').replace(/\\/g, '/'); if (path && !this.images.includes(path)) this.images.push(path); return '&' + imageVarName(path); }
  font(f) {
    if (/^(montserrat|unscii|dejavu|simsun)_/i.test(f) || /^montserrat/i.test(f)) return '&lv_font_' + f;
    return '&ui_font_' + f;
  }

  // ------------------------------------------------------------ styles
  styleLines(n, v) {
    const blocks = [];
    for (const sp of (n.properties || []).filter((p) => p.InheritedType === 11)) {
      const { sub, part, groups } = partDescriptor(sp);
      const target = sub ? sub.replace('{0}', v) : v;
      const order = groups.flatMap((g) => STYLE_GROUPS[g] || []);
      const lines = [];
      for (const st of sp.childs || []) {
        // styles of a sub object (dropdown list, tab buttons) get an extra space before the selector
        const sp2 = sub ? ' ' : '';
        const sel = `${sp2}${part}| LV_STATE_${st.strval || 'DEFAULT'}`;
        const csel = `${sp2}${part} | LV_STATE_${st.strval || 'DEFAULT'}`;
        // 0x200000 marks an unset placeholder value (component definitions keep the whole style list)
        // older component files mark them read_only instead
        const items = (st.childs || []).filter((c) => c.InheritedType !== 1 && !(pflags(c) & 0x200000) && !c.read_only);
        const known = new Set(Object.values(STYLE_GROUPS).flat());
        for (const c of items) { const k = c.strtype.slice(7); if (!known.has(k)) this.warn(`Unsupported style property skipped: ${k}`); }
        // only the properties of the part's groups are written, in the reference order
        const ticks9 = this.v9 && T(n) === 'CHART' && part === 'LV_PART_TICKS';
        for (const k of order) for (const c of items) {
          if (c.strtype !== '_style/' + k) continue;
          if (!ticks9) { this.styleItem(n, target, c, sel, csel, lines); continue; }
          // LVGL 9: the chart's tick styles go to its scales; line styles to their ticks, text styles to their labels
          const parts = /^Text/.test(k) ? ['LV_PART_MAIN'] : ['LV_PART_INDICATOR', 'LV_PART_ITEMS'];
          const state = `LV_STATE_${st.strval || 'DEFAULT'}`;
          for (const pt of parts) for (const a of ['Xaxis', 'Yaxis1', 'Yaxis2']) this.styleItem(n, `${v}_${a}`, c, `${pt}| ${state}`, `${pt} | ${state}`, lines);
        }
      }
      blocks.push(lines);
    }
    // the main part follows the widget lines directly; every other non-empty part gets a blank line before it
    const out = [];
    if (this.chartPost && T(n) === 'CHART') {
      // LVGL 9 charts: the scales and series come after the main part
      while (blocks.length < 2) blocks.push([]);
      blocks[1].unshift(...this.chartPost);
      this.chartPost = null;
    }
    blocks.forEach((b, i) => { if (!b.length) return; if (i > 0) out.push(''); out.push(...b); });
    return out;
  }

  styleItem(n, t, c, sel, csel, out) {
    const k = c.strtype.slice('_style/'.length);
    const ia = c.intarray || [], iv = c.integer ?? 0, sv = c.strval ?? '';
    const set = (name, val) => out.push(`lv_obj_set_style_${name}(${t}, ${val}, ${sel});`);
    const th = (COLOR_STYLE[k] || RECOLOR_STYLE[k]) && this.themeColor(c);
    if (th) { // a theme colour: set through the theme manager so ui_theme_set() can change it
      const nm = COLOR_STYLE[k] ? COLOR_STYLE[k] + '_color' : RECOLOR_STYLE[k], opa = (COLOR_STYLE[k] || RECOLOR_STYLE[k]) + '_opa';
      out.push(`ui_object_set_themeable_style_property(${t}, ${sel}, LV_STYLE_${nm.toUpperCase()}, _ui_theme_color_${th});`);
      out.push(`ui_object_set_themeable_style_property(${t}, ${sel}, LV_STYLE_${opa.toUpperCase()}, _ui_theme_alpha_${th});`);
      return;
    }
    if (COLOR_STYLE[k]) {
      const nm = COLOR_STYLE[k];
      out.push(`lv_obj_set_style_${nm}_color(${t}, lv_color_hex(${hex6(ia)}), ${csel} );`);
      set(`${nm}_opa`, ia[3] ?? 255);
      return;
    }
    if (RECOLOR_STYLE[k]) {
      set(RECOLOR_STYLE[k], `lv_color_hex(${hex6(ia)})`);
      set(`${RECOLOR_STYLE[k]}_opa`, ia[3] ?? 255);
      return;
    }
    switch (k) {
      case 'Bg_Radius': set('radius', iv); break;
      case 'Bg_gradiens_Color': out.push(`lv_obj_set_style_bg_grad_color(${t}, lv_color_hex(${hex6(ia)}), ${csel} );`); break;
      case 'Bg_gradient_params': set('bg_main_stop', ia[0] ?? 0); set('bg_grad_stop', ia[1] ?? 255); break;
      case 'Gradient direction': set('bg_grad_dir', 'LV_GRAD_DIR_' + sv); break;
      case 'Bg_Image': if (sv && sv !== 'noimage' && this.hasImage(sv)) out.push(`lv_obj_set_style_bg_img_src( ${t}, ${this.useImage(sv)}, ${csel} );`); break;
      case 'Bg_Image_opa': set('bg_img_opa', iv); break;
      case 'Bg_Image_Tiled': set('bg_img_tiled', sv === 'True' ? 'true' : 'false'); break;
      case 'Clip_corner': set('clip_corner', sv === 'True' ? 'true' : 'false'); break;
      case 'Border width': set('border_width', iv); break;
      case 'Border side': set('border_side', 'LV_BORDER_SIDE_' + sv); break;
      case 'Outline_params': set('outline_width', ia[0] ?? 0); set('outline_pad', ia[1] ?? 0); break;
      case 'Shadow_params': set('shadow_width', ia[0] ?? 0); set('shadow_spread', ia[1] ?? 0); break;
      case 'Shadow_offset': set('shadow_ofs_x', ia[0] ?? 0); set('shadow_ofs_y', ia[1] ?? 0); break;
      case 'Padding': set('pad_left', ia[0] ?? 0); set('pad_right', ia[1] ?? 0); set('pad_top', ia[2] ?? 0); set('pad_bottom', ia[3] ?? 0); break;
      case 'Padding_RowCol': set('pad_row', ia[0] ?? 0); set('pad_column', ia[1] ?? 0); break;
      case 'Text_Align': set('text_align', 'LV_TEXT_ALIGN_' + sv); break;
      case 'Text_Font': if (sv) set('text_font', this.font(sv)); break;
      case 'Text_Spacing': set('text_letter_space', ia[0] ?? 0); set('text_line_space', ia[1] ?? 0); break;
      case 'Text_Decor': set('text_decor', 'LV_TEXT_DECOR_' + sv); break;
      case 'Arc_Width': set('arc_width', iv); break;
      case 'Arc_Rounded': set('arc_rounded', sv === 'True' ? 'true' : 'false'); break;
      case 'Arc_Image': if (this.hasImage(sv)) set('arc_img_src', this.useImage(sv)); break;
      case 'Line_Width': set('line_width', iv); break;
      case 'Line_Rounded': set('line_rounded', sv === 'True' ? 'true' : 'false'); break;
      case 'Blend mode': set('blend_mode', 'LV_BLEND_MODE_' + sv); break;
      case 'Blend_opacity': set('opa', iv); break;
      case 'Size_size': set('size', this.v9 ? `${iv}, ${iv}` : iv); break;
      default:
        if (c.InheritedType === 1) break; // group header (Blend, Border, Text, ...)
        this.warn(`Unsupported style property skipped: ${k}`);
    }
  }

  // ------------------------------------------------------------ widgets
  flagLines(n, v) {
    const t = T(n), add = [], clear = [];
    const lvdef = (this.v9 && t === 'CHART' ? { Scroll_elastic: false } : LV_DEFAULT[t]) || {};
    for (const [nm, lv, absent] of FLAGS) {
      const abs = ABSENT[t]?.[nm] ?? absent;
      const val = bool(n, nm, nm === 'Ignore_layout' ? bool(n, 'Igonre_layout', abs) : abs);
      const def = nm in lvdef ? lvdef[nm] : (nm === 'Hidden' ? false : absent);
      if (val && !def) add.push('LV_OBJ_FLAG_' + lv);
      else if (!val && def) clear.push('LV_OBJ_FLAG_' + lv);
    }
    const out = [];
    if (add.length) out.push(`lv_obj_add_flag( ${v}, ${add.join(' | ')} );   /// Flags`);
    if (clear.length) out.push(`lv_obj_clear_flag( ${v}, ${clear.join(' | ')} );    /// Flags`);
    if (this.v9 && t === 'CHART') {
      out.push(`lv_obj_add_flag( ${v}, LV_OBJ_FLAG_OVERFLOW_VISIBLE );    //make scales visible - Should it be forced to True? `);
      out.push(`//lv_obj_remove_flag( ${v}, LV_OBJ_FLAG_SCROLLABLE );    //no chart-zoom in LVGL9 - Shouldn't it be forced to False?`);
    }
    return out;
  }

  stateLines(n, v) {
    const on = STATES.filter(([nm]) => bool(n, nm, false)).map(([, s]) => 'LV_STATE_' + s);
    return on.length ? [`lv_obj_add_state( ${v}, ${on.join(' | ')} );     /// States`] : [];
  }

  scrollLines(n, v) {
    const out = [];
    const sb = str(n, 'Scrollbar_mode', 'AUTO'), dir = str(n, 'Scroll_direction', 'ALL');
    const sx = str(n, 'Scroll_snap_x', 'NONE'), sy = str(n, 'Scroll_snap_y', 'NONE');
    if (T(n) === 'TABVIEW') return out; // not written for tabviews
    if (sb !== 'AUTO') out.push(`lv_obj_set_scrollbar_mode(${v}, LV_SCROLLBAR_MODE_${sb});`);
    if (dir !== 'ALL') out.push(`lv_obj_set_scroll_dir(${v}, LV_DIR_${dir});`);
    if (sx !== 'NONE') out.push(`lv_obj_set_scroll_snap_x(${v}, LV_SCROLL_SNAP_${sx});`);
    if (sy !== 'NONE') out.push(`lv_obj_set_scroll_snap_y(${v}, LV_SCROLL_SNAP_${sy});`);
    return out;
  }

  transformLines(n, v) {
    const out = [];
    const size = prop(n, 'Size'), pos = prop(n, 'Position');
    if (size) {
      const f = size.flags ?? size.mode ?? 17, [w = 0, h = 0] = size.intarray || [];
      const one = (dim, val, u) => {
        const sp = dim === 'width' ? '  ' : '   ';
        if (u === 6) return `lv_obj_set_flex_grow( ${v}, ${val});`;
        if (u === 3) return `lv_obj_set_${dim}( ${v}, LV_SIZE_CONTENT);${sp}/// ${ccomment(val)}`;
        if (u === 2) return `lv_obj_set_${dim}( ${v}, lv_pct(${val}));`;
        return `lv_obj_set_${dim}( ${v}, ${val});`;
      };
      const uw = (f & 0xf) || 1, uh = ((f >> 4) & 0xf) || 1;
      const lines = [[uw, one('width', w, uw)], [uh, one('height', h, uh)]];
      // order: pixels, percent, content, flex grow
      const rank = (u) => ({ 1: 0, 2: 1, 3: 2, 6: 3 }[u] ?? 1);
      lines.sort((a, b) => rank(a[0]) - rank(b[0]));
      out.push(...lines.map((l) => l[1]));
    }
    if (pos) {
      const f = pos.flags ?? pos.mode ?? 17, [x = 0, y = 0] = pos.intarray || [];
      const ux = (f & 0xf) || 1, uy = ((f >> 4) & 0xf) || 1;
      if (x || y || ux !== 1 || uy !== 1) out.push(...posLines(v, x, y, ux, uy));
    }
    const al = str(n, 'Align', pos ? 'CENTER' : 'TOP_LEFT');
    if (pos && al !== 'TOP_LEFT') out.push(`lv_obj_set_align( ${v}, LV_ALIGN_${al} );`);
    // LVGL 9 only (left out for LVGL 8)
    const eca = int(n, 'Extend_click_area', 0);
    if (this.v9 && eca) out.push(`lv_obj_set_ext_click_area(${v}, ${eca});`);
    const lt = prop(n, 'Layout_type');
    if (lt && (lt.LayoutType === 1 || lt.strval === 'Flex')) {
      const FLOW = ['ROW', 'COLUMN'];
      const AL = ['START', 'CENTER', 'END', 'SPACE_BETWEEN', 'SPACE_AROUND', 'SPACE_EVENLY'];
      const flow = (FLOW[lt.Flow] || 'ROW') + (lt.Wrap ? '_WRAP' : '') + (lt.Reversed ? '_REVERSE' : '');
      out.push(`lv_obj_set_flex_flow(${v},LV_FLEX_FLOW_${flow});`);
      out.push(`lv_obj_set_flex_align(${v}, LV_FLEX_ALIGN_${AL[lt.MainAlignment] || 'START'}, LV_FLEX_ALIGN_${AL[lt.CrossAlignment] || 'START'}, LV_FLEX_ALIGN_${AL[lt.TrackAlignment] || 'START'});`);
    }
    return out;
  }

  /** Lines that create the widget plus the ones written before the size. */
  createLines(n, v, pv) {
    const t = T(n);
    switch (t) {
      case 'SCREEN': return [`${v} = lv_obj_create(NULL);`];
      case 'PANEL': return [`${v} = lv_obj_create(${pv});`];
      case 'CONTAINER': return [`${v} = lv_obj_create(${pv});`, `lv_obj_remove_style_all(${v});`];
      case 'BUTTON': return [`${v} = lv_btn_create(${pv});`];
      case 'LABEL': return [`${v} = lv_label_create(${pv});`];
      case 'IMAGE': { const a = str(n, 'Asset'); return [`${v} = lv_img_create(${pv});`, ...(this.hasImage(a) ? [`lv_img_set_src(${v}, ${this.useImage(a)});`] : [])]; }
      case 'ARC': return [`${v} = lv_arc_create(${pv});`];
      case 'SWITCH': return [`${v} = lv_switch_create(${pv});`];
      case 'KEYBOARD': {
        const m = str(n, 'Mode', 'TEXT_LOWER');
        return [`${v} = lv_keyboard_create(${pv});`, ...(m && m !== 'TEXT_LOWER' ? [`lv_keyboard_set_mode(${v},LV_KEYBOARD_MODE_${m});`] : [])];
      }
      case 'TEXTAREA': return [`${v} = lv_textarea_create(${pv});`];
      case 'SPINBOX': return [`${v} = lv_spinbox_create(${pv});`];
      case 'CHART': return [`${v} = lv_chart_create(${pv});`];
      case 'CALENDAR': return [`${v} = lv_calendar_create(${pv});`, `lv_obj_t *${v}_header = lv_calendar_header_arrow_create(${v});`];
      case 'COLORWHEEL':
        if (this.v9) this.warn(`LVGL 9 has no Colorwheel: ${v}`);
        return [`${v} = lv_colorwheel_create(${pv},true);`];
      case 'IMGBUTTON': {
        const out = [`${v} = lv_imgbtn_create(${pv});`];
        for (const [k, st] of [['Image_released', 'RELEASED'], ['Image_pressed', 'PRESSED'], ['Image_disabled', 'DISABLED'], ['Image_checked_pressed', 'CHECKED_PRESSED'], ['Image_checked_released', 'CHECKED_RELEASED'], ['Image_checked_disabled', 'CHECKED_DISABLED']]) {
          const a = str(n, k);
          if (a && a !== '-' && this.hasImage(a)) out.push(`lv_imgbtn_set_src(${v}, LV_IMGBTN_STATE_${st}, NULL, ${this.useImage(a)}, NULL);`);
        }
        return out;
      }
      case 'SPINNER': {
        const t = int(n, 'Time', 1000) || 1000, len = int(n, 'Arc_length', 90) || 90;
        // LVGL 9 creates the spinner without parameters; the call is left commented out
        return this.v9 ? [`${v} = lv_spinner_create(${pv});`, `//lv_spinner_set_anim_params(${v}, ${t}, ${len});`] : [`${v} = lv_spinner_create(${pv},${t},${len});`];
      }
      case 'TABVIEW': {
        const pos = str(n, 'Tab_position', 'TOP'), size = int(n, 'Tab_size', 50);
        return this.v9 ? [`${v} = lv_tabview_create(${pv});`, `lv_tabview_set_tab_bar_position(${v},LV_DIR_${pos});`, `lv_tabview_set_tab_bar_size(${v},${size});`]
          : [`${v} = lv_tabview_create(${pv}, LV_DIR_${pos}, ${size});`];
      }
      case 'TABPAGE': return [`${v} = lv_tabview_add_tab(${pv}, "${cstr(str(n, 'Title'))}");`];
      case 'CHECKBOX': {
        const t = str(n, 'Title', 'Checkbox'); // the default title is not written
        return [`${v} = lv_checkbox_create(${pv});`, ...(t !== 'Checkbox' ? [`lv_checkbox_set_text(${v},"${cstr(t)}");`] : [])];
      }
      case 'ROLLER': {
        const sel = int(n, 'Selected', 0);
        return [`${v} = lv_roller_create(${pv});`, `lv_roller_set_options( ${v}, "${cstr(str(n, 'Options'))}", LV_ROLLER_MODE_${str(n, 'Mode', 'NORMAL')} );`, ...(sel ? [`lv_roller_set_selected( ${v}, ${sel}, LV_ANIM_OFF);`] : [])];
      }
      case 'DROPDOWN': {
        const out = [`${v} = lv_dropdown_create(${pv});`];
        const la = str(n, 'List_align', 'BOTTOM');
        if (la !== 'BOTTOM') out.push(`lv_dropdown_set_dir( ${v}, LV_DIR_${la});`);
        if (str(n, 'Options') || !this.v9) out.push(`lv_dropdown_set_options( ${v}, "${cstr(str(n, 'Options'))}" );`);
        if (bool(n, 'Show_selected', true) === false) out.push(`lv_dropdown_set_selected_highlight( ${v}, false);`);
        const bt = str(n, 'Base_text');
        if (bt) out.push(`lv_dropdown_set_text( ${v}, "${cstr(bt)}");`);
        return out;
      }
      case 'BAR': {
        const out = [`${v} = lv_bar_create(${pv});`];
        const mode = str(n, 'Mode', 'NORMAL');
        if (mode !== 'NORMAL') out.push(`lv_bar_set_mode(${v}, LV_BAR_MODE_${mode});`);
        const r = arr(n, 'Range', [0, 100]);
        if (r[0] !== 0 || r[1] !== 100) out.push(`lv_bar_set_range(${v}, ${r[0]},${r[1]});`);
        const val = int(n, 'Value', 0);
        if (val !== 0) { out.push(`lv_bar_set_value(${v},${val},LV_ANIM_OFF);`); out.push(`lv_bar_set_start_value(${v}, ${int(n, 'Value_start', 0)}, LV_ANIM_OFF);`); }
        return out;
      }
      case 'SLIDER': {
        const out = [`${v} = lv_slider_create(${pv});`];
        const r = arr(n, 'Range', [0, 100]);
        if (r[0] !== 0 || r[1] !== 100) out.push(`lv_slider_set_range(${v}, ${r[0]},${r[1]});`);
        const mode = str(n, 'Mode', 'NORMAL');
        if (mode !== 'NORMAL') out.push(`lv_slider_set_mode(${v}, LV_SLIDER_MODE_${mode});`);
        out.push(`lv_slider_set_value( ${v}, ${int(n, 'Value', 0)}, LV_ANIM_OFF);`);
        out.push(`if (lv_slider_get_mode(${v})==LV_SLIDER_MODE_RANGE ) lv_slider_set_left_value( ${v}, ${int(n, 'Value_left', 0)}, LV_ANIM_OFF);`);
        return out;
      }
      default:
        this.warn(`Unsupported widget type exported as lv_obj: ${t}`);
        return [`${v} = lv_obj_create(${pv});`];
    }
  }

  /** Widget property lines written after the transform. */
  propLines(n, v) {
    const t = T(n), out = [];
    switch (t) {
      case 'LABEL': {
        const lm = str(n, 'Long_mode', 'WRAP');
        if (lm !== 'WRAP') out.push(`lv_label_set_long_mode(${v},LV_LABEL_LONG_${lm});`);
        const txt = str(n, 'Text');
        // "Text" is LVGL 8's default; LVGL 9 labels start empty
        if (txt !== 'Text' || this.v9) out.push(`lv_label_set_text(${v},"${cstr(txt)}");`);
        if (bool(n, 'Recolor', false)) out.push(`lv_label_set_recolor(${v},"true");`);
        break;
      }
      case 'IMAGE': {
        const piv = arr(n, 'Pivot', [0, 0]), rot = int(n, 'Rotation', 0), sc = int(n, 'Scale', 256);
        if (piv[0] || piv[1]) out.push(`lv_img_set_pivot(${v},${piv[0]},${piv[1]});`);
        if (rot) out.push(`lv_img_set_angle(${v},${rot});`);
        if (sc !== 256) out.push(`lv_img_set_zoom(${v},${sc});`);
        break;
      }
      case 'ARC': {
        const r = arr(n, 'Range', [0, 100]);
        if (r[0] !== 0 || r[1] !== 100) out.push(`lv_arc_set_range(${v}, ${r[0]},${r[1]});`);
        out.push(`lv_arc_set_value(${v}, ${int(n, 'Value', 0)});`);
        const bg = arr(n, 'Bg_angles', [120, 60]);
        if (bg[0] !== 120 || bg[1] !== 60) out.push(`lv_arc_set_bg_angles(${v},${bg[0]},${bg[1]});`);
        const mode = str(n, 'Mode', 'NORMAL');
        if (mode !== 'NORMAL') out.push(`lv_arc_set_mode(${v}, LV_ARC_MODE_${mode});`);
        const rot = int(n, 'Rotation', 0);
        if (rot) out.push(`lv_arc_set_rotation(${v},${rot});`);
        break;
      }
      case 'TEXTAREA': {
        const ac = str(n, 'Accepted_characters');
        if (ac) out.push(`lv_textarea_set_accepted_chars(${v}, "${cstr(ac)}");`);
        const ml = int(n, 'Max_text_length', 0);
        if (ml && ml !== 98989898) out.push(`lv_textarea_set_max_length(${v},${ml});`);
        const txt = str(n, 'Text');
        if (txt) out.push(`lv_textarea_set_text(${v},"${cstr(txt)}");`);
        const ph = str(n, 'Placeholder');
        if (ph) out.push(`lv_textarea_set_placeholder_text(${v},"${cstr(ph)}");`);
        if (bool(n, 'One_line_mode', false)) out.push(`lv_textarea_set_one_line(${v},true);`);
        if (bool(n, 'Password_mode', false)) out.push(`lv_textarea_set_password_mode(${v}, true);`);
        break;
      }
      case 'CHART': {
        const r1 = arr(n, 'Primary_Y_range', [0, 100]), r2 = arr(n, 'Secondary_Y_range', [0, 100]);
        const dl = arr(n, 'Division_lines', [5, 5]), zm = arr(n, 'Zoom', [256, 256]);
        if (str(n, 'Chart_type')) out.push(`lv_chart_set_type( ${v}, LV_CHART_TYPE_${str(n, 'Chart_type')});`);
        out.push(`lv_chart_set_point_count( ${v}, ${int(n, 'Number_of_points', 10)});`);
        if (r1[0] !== 0 || r1[1] !== 100) out.push(`lv_chart_set_range( ${v}, LV_CHART_AXIS_PRIMARY_Y, ${r1[0]}, ${r1[1]});`);
        if (r2[0] !== 0 || r2[1] !== 100) out.push(`lv_chart_set_range( ${v}, LV_CHART_AXIS_SECONDARY_Y, ${r2[0]}, ${r2[1]});`);
        out.push(`lv_chart_set_div_line_count( ${v}, ${dl[0]}, ${dl[1]});`);
        if (zm[0] !== 256) out.push(`lv_chart_set_zoom_x( ${v}, ${zm[0]});`);
        if (zm[1] !== 256) out.push(`lv_chart_set_zoom_y( ${v}, ${zm[1]});`);
        if (this.v9) { out.push(...this.chartAxes9(n, v)); break; }
        for (const [ax, maj, min, lab, fs] of [['PRIMARY_X', 'XMajor', 'XMinor', 'Labels_on_X_axis', 'Font_size_on_X_axis'], ['PRIMARY_Y', 'PrimaryYMajor', 'PrimaryYMinor', 'Labels_on_Primary_Y_axis', 'Font_size_on_Primary_Y_axis'], ['SECONDARY_Y', 'SecondaryYMajor', 'SecondaryYMinor', 'Labels_on_Secondary_Y_axis', 'Font_size_on_Secondary_Y_axis']]) {
          const a = arr(n, maj, [0, 0]), b = arr(n, min, [0, 0]);
          out.push(`lv_chart_set_axis_tick( ${v}, LV_CHART_AXIS_${ax}, ${a[0]}, ${b[0]}, ${a[1]}, ${b[1]}, ${bool(n, lab, false) ? 'true' : 'false'}, ${int(n, fs, 0)});`);
        }
        out.push(...this.chartSeries(n, v));
        break;
      }
      case 'SPINBOX': {
        const df = arr(n, 'Digit_format', [5, 0]), r = arr(n, 'Range', [-99999, 99999, 1]);
        out.push(`lv_spinbox_set_digit_format( ${v}, ${df[0]}, ${df[1]});`);
        out.push(`lv_spinbox_set_range( ${v}, ${r[0]},${r[1]} );`);
        out.push(`lv_spinbox_set_cursor_pos(${v}, ${r[2] ?? 1} - 1);`);
        const val = int(n, 'Value', 0);
        if (val) out.push(`lv_spinbox_set_value( ${v}, ${val} );`);
        break;
      }
      default: break;
    }
    return out;
  }

  widgetBlock(n, pv, out, vars, events, post, after) {
    if (n.cid && n.cid !== 'None') return this.instanceBlock(n, pv, out, vars, events, post, after);
    const v = this.v(n);
    if (!this.inComp) vars.push(n);
    // LVGL 9 chart scales are screen variables too (declared, not reset in screen_destroy)
    if (this.inComp && this.v9 && T(n) === 'CHART') this.warn(`Chart inside a component (${this.name(n)}) is not verified on LVGL 9`);
    if (!this.inComp && this.v9 && T(n) === 'CHART') vars.push(...['Xaxis', 'Yaxis1', 'Yaxis2'].map((a) => ({ axisVar: `${v}_${a}` })));
    const lines = [...this.createLines(n, v, pv)];
    const flex = T(n) === 'SCREEN' || T(n) === 'TABPAGE' ? this.transformLines(n, v).filter((l) => l.startsWith('lv_obj_set_flex_')) : [];
    if (T(n) !== 'SCREEN' && T(n) !== 'TABPAGE') lines.push(...this.transformLines(n, v));
    else if (T(n) === 'TABPAGE') lines.push(...flex);
    const props = this.propLines(n, v);
    const late = T(n) === 'IMAGE' || T(n) === 'ARC' || (this.v9 && T(n) === 'CHART'); // these widgets' properties come after the flags
    if (!late) lines.push(...props);
    lines.push(...this.stateLines(n, v));
    lines.push(...this.flagLines(n, v));
    if (this.v9 && T(n) === 'IMAGE' && !this.contentSized(n)) lines.push(`lv_image_set_inner_align( ${v}, LV_IMAGE_ALIGN_TILE );`);
    if (T(n) === 'SCREEN') lines.push(...flex); // a screen's layout comes after its flags
    lines.push(...this.scrollLines(n, v));
    if (late) lines.push(...props);
    lines.push(...this.styleLines(n, v));
    if (this.inComp) out.push(`lv_obj_t *${v};`);
    out.push(...lines, '');
    if (this.v9 && (T(n) === 'SLIDER' || T(n) === 'BAR')) out.push(...this.barFix(v));
    if (this.chartFix && T(n) === 'CHART') { out.push(...this.chartFix); this.chartFix = null; }
    const hasEv = this.handlers(n).length > 0;
    if (hasEv) events.push(n);
    if (T(n) === 'KEYBOARD') { const tg = str(n, 'Target_textarea'); if (tg && tg !== '-') post.push(`lv_keyboard_set_textarea(${v},${this.ref(tg)});`); }
    for (const c of kids(n)) this.widgetBlock(c, v, out, vars, events, post);
    if (after) out.push(after);
    // callbacks are registered children first (post-order)
    if (hasEv) post.push(this.addEventCb(n));
  }

  chartSeries(n, v) {
    const out = [];
    let series = [];
    try { series = JSON.parse(str(n, 'ChartData', '[]')) || []; } catch { this.warn(`Cannot read chart data: ${this.name(n)}`); }
    series.forEach((sr, i) => {
      const sv = `${v}_series_${i + 1}`;
      out.push(`lv_chart_series_t* ${sv} = lv_chart_add_series(${v}, lv_color_hex(${hex6(sr.Color || [0, 0, 0])}), LV_CHART_AXIS_${sr.Axis === 1 ? 'SECONDARY_Y' : 'PRIMARY_Y'});`);
      out.push(`static lv_coord_t ${sv}_array[] = { ${(sr.Series || []).join(',')} };`);
      out.push(`lv_chart_set_ext_y_array(${v}, ${sv}, ${sv}_array);`);
    });
    return out;
  }
  /** LVGL 9 has no chart axis ticks: three lv_scale objects are added (<chart>_Xaxis, _Yaxis1, _Yaxis2) */
  chartAxes9(n, v) {
    const ax = (maj, min, lab, fs, def) => ({ maj: arr(n, maj, [0, 0]), min: arr(n, min, [0, 0]), lab: bool(n, lab, false), fs: int(n, fs, def) });
    const X = ax('XMajor', 'XMinor', 'Labels_on_X_axis', 'Font_size_on_X_axis', 0);
    const Y1 = ax('PrimaryYMajor', 'PrimaryYMinor', 'Labels_on_Primary_Y_axis', 'Font_size_on_Primary_Y_axis', 0);
    const Y2 = ax('SecondaryYMajor', 'SecondaryYMinor', 'Labels_on_Secondary_Y_axis', 'Font_size_on_Secondary_Y_axis', 0);
    const r1 = arr(n, 'Primary_Y_range', [0, 100]), r2 = arr(n, 'Secondary_Y_range', [0, 100]);
    const o = [];
    const x = `${v}_Xaxis`;
    o.push(`${x} = lv_scale_create( ${v} );`, `lv_scale_set_mode( ${x}, LV_SCALE_MODE_HORIZONTAL_BOTTOM );`, `lv_obj_set_size( ${x}, lv_pct(100), ${X.fs} );`,
      `lv_obj_set_align( ${x}, LV_ALIGN_BOTTOM_MID );`,
      `lv_obj_set_y( ${x}, ${X.fs} + lv_obj_get_style_pad_bottom(${v},LV_PART_MAIN) + lv_obj_get_style_border_width(${v},LV_PART_MAIN) );`,
      `lv_obj_set_style_line_width( ${x}, 0, LV_PART_MAIN );`, `lv_obj_set_style_line_width( ${x}, 1, LV_PART_ITEMS ); //LVGL-9.1 ticks are thicker by default`,
      `lv_obj_set_style_line_width( ${x}, 1, LV_PART_INDICATOR );`,
      `lv_obj_set_style_length( ${x}, ${X.min[0]}, LV_PART_ITEMS );    //minor tick length`, `lv_obj_set_style_length( ${x}, ${X.maj[0]}, LV_PART_INDICATOR );    //major tick length`,
      `lv_scale_set_range( ${x}, 0, ${X.maj[1]} > 0 ? ${X.maj[1]} - 1 : 0 );`,
      `lv_scale_set_total_tick_count( ${x}, (${X.maj[1]}>0 ? ${X.maj[1]}-1 : 0) * ${X.min[1]} + 1 );`,
      `lv_scale_set_major_tick_every( ${x}, ${X.min[1]} >= 1 ? ${X.min[1]} : 1 );`);
    if (!X.lab) o.push(`lv_scale_set_label_show( ${x}, false );`);
    for (const [y, A, r, mode, align, pos] of [[`${v}_Yaxis1`, Y1, r1, 'VERTICAL_LEFT', 'LEFT_MID', (s) => `-${s} - lv_obj_get_style_pad_left(${v},LV_PART_MAIN) - lv_obj_get_style_border_width(${v},LV_PART_MAIN) + 2`],
      [`${v}_Yaxis2`, Y2, r2, 'VERTICAL_RIGHT', 'RIGHT_MID', (s) => `${s} + lv_obj_get_style_pad_right(${v},LV_PART_MAIN) + lv_obj_get_style_border_width(${v},LV_PART_MAIN) + 1`]]) {
      o.push(`${y} = lv_scale_create( ${v} );`, `lv_scale_set_mode( ${y}, LV_SCALE_MODE_${mode} );`, `lv_obj_set_size( ${y}, ${A.fs}, lv_pct(100) );`,
        `lv_obj_set_align( ${y}, LV_ALIGN_${align} );`, `lv_obj_set_x( ${y}, ${pos(A.fs)} );`,
        `lv_obj_set_style_line_width( ${y}, 0, LV_PART_MAIN );`, `lv_obj_set_style_line_width( ${y}, 1, LV_PART_ITEMS );`, `lv_obj_set_style_line_width( ${y}, 1, LV_PART_INDICATOR );`,
        `lv_obj_set_style_length( ${y}, ${A.min[0]}, LV_PART_ITEMS ); //minor tick length`, `lv_obj_set_style_length( ${y}, ${A.maj[0]}, LV_PART_INDICATOR ); //major tick length`);
      if (r[0] !== 0 || r[1] !== 100) o.push(`lv_scale_set_range( ${y},  ${r[0]}, ${r[1]} );`);
      o.push(`lv_scale_set_total_tick_count( ${y}, (${A.maj[1]} > 0 ? ${A.maj[1]}-1 : 0) * ${A.min[1]} + 1 );`, `lv_scale_set_major_tick_every( ${y}, ${A.min[1]} >= 1 ? ${A.min[1]} : 1 );`);
      if (!A.lab) o.push(`lv_scale_set_label_show( ${y}, false );`);
    }
    // these go after the chart's main style part
    this.chartPost = [...o, ...this.chartSeries(n, v)];
    this.chartFix = ['//This workaround (an invisible outline) is needed because without it chart overflow-visible doesn\'t work in LVGL-9.1',
      `lv_obj_set_style_outline_pad( ${v}, LV_MAX3(${X.fs}, ${Y1.fs}, ${Y2.fs}), LV_PART_MAIN | LV_STATE_DEFAULT ); //workaround for ineffective 'overflow visible' flag`,
      `lv_obj_set_style_outline_width( ${v}, -1, LV_PART_MAIN | LV_STATE_DEFAULT );`];
    return [];
  }
  /** LVGL 9: an image whose size is not "content" in both directions is tiled like in LVGL 8 */
  contentSized(n) {
    const p = prop(n, 'Size'); if (!p) return true;
    const f = p.flags ?? p.mode ?? 17;
    return (f & 0xf) === 3 && ((f >> 4) & 0xf) === 3;
  }
  barFix(v) {
    return ['//Compensating for LVGL9.1 draw crash with bar/slider max value when top-padding is nonzero and right-padding is 0',
      `if (lv_obj_get_style_pad_top(${v},LV_PART_MAIN) > 0) lv_obj_set_style_pad_right( ${v}, lv_obj_get_style_pad_right(${v},LV_PART_MAIN) + 1, LV_PART_MAIN );`];
  }

  // ------------------------------------------------------------ components
  /** Load components/*.comp.json (component definitions) */
  async loadComponents() {
    const list = ((await this.opts.listFiles?.()) || []).filter((f) => /^components\/[^/]+\.comp\.json$/i.test(f));
    const comps = [];
    for (const f of list) {
      const bytes = await this.opts.readFile(f);
      if (!bytes) continue;
      let root;
      try { root = JSON.parse(typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes)); } catch { this.warn(`Cannot read component file: ${f}`); continue; }
      normalizeProps(root);
      const name = cid(str(root, 'Name', f.split('/').pop().replace(/\.comp\.json$/i, '')));
      // "_Screen_Widget_Name": ui_Panel_header_create, constants UI_COMP_PANEL_HEADER_... (with naming_add_subcomponent)
      const id = this.low(this.naming ? `${typeLabel(T(root))}_${name}` : name);
      const up = (this.subNaming ? `${T(root)}_${name}` : name).toUpperCase();
      const nodes = [], byGuid = new Map(), constOf = new Map(), pathOf = new Map();
      // child constants are named after the path below the component root: UI_COMP_CARD_CARDBG2_CARD_TITLE
      const walk = (n) => { nodes.push(n); byGuid.set(n.guid, n); kids(n).forEach(walk); };
      walk(root);
      comps.push({ id, name, up, guard: name.toUpperCase(), root, nodes, byGuid, constOf, pathOf, file: name.toLowerCase(), title: str(root, 'Name', name) });
    }
    comps.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)); // ordinal, so "Button" sorts before "bar_group"
    for (const c of comps) this.components.set(c.root.guid, c);
    // child constants are named after the path below the component root: UI_COMP_CARD_CARDBG2_CARD_TITLE
    // ("_Screen_Widget_Name": every path element is <Type>_<Name>; a nested instance's type is its component name)
    for (const c of comps) {
      const walk = (n, path) => {
        const nm = this.naming ? `${this.typeOf(n)}_${cid(str(n, 'Name', T(n)))}` : cid(str(n, 'Name', T(n)));
        const p2 = n === c.root ? [] : [...path, nm];
        c.constOf.set(n, `UI_COMP_${c.up}_${(n === c.root ? nm : p2.join('_')).toUpperCase()}`);
        c.pathOf.set(n, n === c.root ? nm : p2.join('_')); // suffix of instance event names (path below the root)
        kids(n).forEach((k) => walk(k, p2));
      };
      walk(c.root, []);
    }
    return comps;
  }

  /** components/ui_comp_<name>.c/.h */
  /** Generate a component's files the first time it is used (that fixes the order its images are listed in). */
  ensureComponent(comp) {
    if (comp.out) return;
    comp.out = {};
    const saved = { inComp: this.inComp };
    comp.out = this.componentFiles(comp);
    this.inComp = saved.inComp;
  }

  componentFiles(comp) {
    const H = this.header();
    this.inComp = comp;
    for (const n of comp.nodes) { const ln = this.localName(n); this.expr.set(n, 'cui_' + ln); this.evNames.set(n, `comp_${comp.id}_${ln}`); }
    const body = [], events = [], post = [];
    this.widgetBlock(comp.root, 'comp_parent', body, [], events, post);
    const evfn = events.map((n) => this.eventFunction(n));
    this.inComp = null;
    const rv = this.expr.get(comp.root);
    let c = `${H}\n#include "../ui.h"\n\n${evfn.map((f) => f + '\n').join('')}// COMPONENT ${ccomment(comp.title)}\n\nlv_obj_t *ui_${comp.id}_create(lv_obj_t *comp_parent) {\n\n`;
    c += body.join('\n') + '\n';
    c += `lv_obj_t ** children = lv_mem_alloc(sizeof(lv_obj_t *) * _UI_COMP_${comp.up}_NUM);\n`;
    c += comp.nodes.map((n) => `children[${comp.constOf.get(n)}] = ${this.expr.get(n)};\n`).join('');
    c += `lv_obj_add_event_cb(${rv}, get_component_child_event_cb, LV_EVENT_GET_COMP_CHILD, children);\n`;
    c += `lv_obj_add_event_cb(${rv}, del_component_child_event_cb, LV_EVENT_DELETE, children);\n`;
    c += post.map((l) => l + '\n').join('');
    c += `ui_comp_${comp.id}_create_hook(${rv});\nreturn ${rv}; \n}\n\n`;
    const h = `${H}\n#ifndef _UI_COMP_${comp.guard}_H\n#define _UI_COMP_${comp.guard}_H\n\n#include "../ui.h"\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\n// COMPONENT ${ccomment(comp.title)}\n`
      + comp.nodes.map((n, i) => `#define ${comp.constOf.get(n)} ${i}\n`).join('')
      + `#define _UI_COMP_${comp.up}_NUM ${comp.nodes.length}\nlv_obj_t *ui_${comp.id}_create(lv_obj_t *comp_parent);\n`
      + events.map((n) => `void ui_event_${this.evName(n)}( lv_event_t * e);\n`).join('')
      + `\n#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n`;
    return { c, h };
  }

  /** A component instance: ui_X = ui_<Comp>_create(parent) followed by the properties changed in this instance. */
  instanceBlock(n, pv, out, vars, events, post, after) {
    const comp = this.components.get(n.cid);
    if (comp) this.ensureComponent(comp);
    const v = this.inComp ? this.expr.get(n) : this.v(n);
    if (!this.inComp) vars.push(n);
    if (!comp) {
      this.warn(`Component definition not found: ${this.name(n)}`);
      return;
    }
    const evs = [];
    const visit = (inst, def, expr, isRoot) => {
      (this.instanceNodes ||= new Set()).add(inst);
      this.expr.set(inst, expr);
      this.evNames.set(inst, `${v.slice(3)}_${this.low(comp.pathOf.get(def))}`);
      const lines = isRoot ? [...(this.inComp ? [`lv_obj_t *${v};`] : []), `${v} = ui_${comp.id}_create(${pv});`] : [];
      lines.push(...this.overrideLines(inst, expr, def));
      if (isRoot || lines.length) out.push(...lines, '');
      // LVGL 9: only the comment is written of the bar/slider workaround for a bar inside an instance
      if (this.v9 && !isRoot && (T(def) === 'SLIDER' || T(def) === 'BAR')) out.push(this.barFix('')[0]);
      if (this.handlers(inst).length) { events.push(inst); evs.push(inst); if (!isRoot && !this.inComp) vars.push({ evOnly: inst }); }
      const defKids = kids(def);
      let k = 0;
      kids(inst).forEach((c, idx) => {
        if (c.coid != null && k < defKids.length) { // part of the component (may itself be a nested component)
          const d = defKids[k++];
          visit(c, d, `ui_comp_get_child(${v}, ${comp.constOf.get(d)})`, false);
        } else {
          // a widget added to this instance only
          this.widgetBlock(c, expr, out, vars, events, post, `lv_obj_move_to_index(${this.v(c)},${idx});`);
        }
      });
      if (isRoot && this.v9 && out[out.length - 1] === this.barFix('')[0]) out.push('');
      if (isRoot && after) out.push(after);
      if (this.handlers(inst).length) post.push(this.addEventCb(inst));
    };
    visit(n, comp.root, v, true);
  }

  /** Only the properties changed in a component instance (flagged 0x10000 / 0x20000 in the project). */
  overrideLines(n, v, def) {
    const ov = new Set((n.properties || []).filter(overridden).map(key));
    ov.delete('Name');
    const out = [];
    // widget property lines, kept when one of their source properties was changed
    const all = [...this.createLines(n, v, 'NULL').slice(1)];
    const pre = all.filter((l) => !/^lv_obj_remove_style_all/.test(l) && lineProps(T(n), l).some((k) => ov.has(k)));
    const props = this.propLines(n, v).filter((l) => lineProps(T(n), l).some((k) => ov.has(k)));
    out.push(...pre);
    const tr = this.transformLines(n, v);
    const f = (re) => tr.filter((l) => re.test(l));
    if (ov.has('Size')) {
      out.push(...f(/^lv_obj_set_(width|height|flex_grow)\(/));
      // the component sized itself with flex grow but this instance does not: grow is reset
      const units = (p) => { const fl = p ? (p.flags ?? p.mode ?? 17) : 17; return [fl & 0xf, (fl >> 4) & 0xf]; };
      const du = units(prop(def, 'Size')), iu = units(prop(n, 'Size'));
      if (du.includes(6) && !iu.includes(6)) out.push(`lv_obj_set_flex_grow( ${v}, 0);`);
    }
    if (ov.has('Position')) {
      const pos = prop(n, 'Position'), fl = pos?.flags ?? pos?.mode ?? 17, [x = 0, y = 0] = pos?.intarray || [];
      out.push(...posLines(v, x, y, (fl & 0xf) || 1, ((fl >> 4) & 0xf) || 1));
    }
    if (ov.has('Align')) out.push(`lv_obj_set_align( ${v}, LV_ALIGN_${str(n, 'Align', 'CENTER')} );`);
    if (ov.has('Layout_type')) out.push(...f(/^lv_obj_set_flex_(flow|align)\(/));
    const late = T(n) === 'IMAGE' || T(n) === 'ARC';
    if (!late) out.push(...props);
    const on = STATES.filter(([nm]) => ov.has(nm) && bool(n, nm, false)).map(([, x]) => 'LV_STATE_' + x);
    const off = STATES.filter(([nm]) => ov.has(nm) && !bool(n, nm, false)).map(([, x]) => 'LV_STATE_' + x);
    if (on.length) out.push(`lv_obj_add_state( ${v}, ${on.join(' | ')} );     /// States`);
    if (off.length) out.push(`lv_obj_clear_state( ${v}, ${off.join(' | ')} );   /// States`);
    const fon = FLAGS.filter(([nm]) => ov.has(nm) && bool(n, nm, false)).map(([, x]) => 'LV_OBJ_FLAG_' + x);
    const foff = FLAGS.filter(([nm]) => ov.has(nm) && !bool(n, nm, false)).map(([, x]) => 'LV_OBJ_FLAG_' + x);
    if (fon.length) out.push(`lv_obj_add_flag( ${v}, ${fon.join(' | ')} );   /// Flags`);
    if (foff.length) out.push(`lv_obj_clear_flag( ${v}, ${foff.join(' | ')} );    /// Flags`);
    out.push(...this.scrollLines(n, v).filter((l) => (/scrollbar_mode/.test(l) && ov.has('Scrollbar_mode')) || (/scroll_dir/.test(l) && ov.has('Scroll_direction')) || (/snap_x/.test(l) && ov.has('Scroll_snap_x')) || (/snap_y/.test(l) && ov.has('Scroll_snap_y'))));
    if (late) out.push(...props);
    // only the style values changed in the instance
    const view = { ...n, properties: (n.properties || []).map((p) => (p.InheritedType !== 11 ? p : { ...p, childs: (p.childs || []).map((st) => ({ ...st, childs: (st.childs || []).filter(overridden) })) })) };
    out.push(...this.styleLines(view, v));
    return out;
  }

  addEventCb(n) { return `lv_obj_add_event_cb(${this.v(n)}, ui_event_${this.evName(n)}, LV_EVENT_ALL, ${this.inComp ? 'children' : 'NULL'});`; }

  // ------------------------------------------------------------ events
  handlers(n) {
    // in a component instance, handlers copied from the component definition (compnid) live in the component file
    const inst = this.instanceNodes?.has(n);
    return (n.properties || []).filter((p) => p.strtype === '_event/EventHandler' && !p.disabled && !(inst && p.compnid));
  }

  actionCode(a) {
    const name = a.strval;
    const params = new Map();
    let callC = '';
    for (const c of a.childs || []) {
      const k = key(c);
      if (k === 'CallC') callC = c.strval || '';
      else if (k !== 'Name' && k !== 'Call') params.set(k, c);
    }
    if (name === 'CALL FUNCTION') {
      const fn = params.get('Function_name')?.strval || '';
      if (fn && !this.functions.some((f) => f[0] === fn)) this.functions.push([fn, params.get('Dont_export_function')?.strval !== 'True']);
    }
    return callC.replace(/<\{([^}]+)\}>/g, (_, k) => {
      const p = params.get(k);
      if (!p) return '';
      if (p.InheritedType === 9) return this.ref(p.strval);
      if (p.InheritedType === 6) return String(p.integer ?? 0);
      if (p.InheritedType === 2) return p.strval === 'True' ? 'true' : 'false';
      if (p.InheritedType === 3) return String(p.strval ?? '').toUpperCase();
      return p.strval ?? '';
    });
  }

  eventFunction(n) {
    const v = this.v(n);
    const bodies = this.handlers(n).map((h) => {
      const acts = (h.childs || []).filter((c) => c.strtype === '_event/action').map((a) => this.actionCode(a));
      return { code: h.strval, acts };
    });
    const conds = bodies.map((b) => eventCondition(b.code));
    const usesTarget = conds.some((c) => c.target) || bodies.some((b) => b.acts.some((s) => /\btarget\b/.test(s)));
    let s = `void ui_event_${this.evName(n)}( lv_event_t * e) {\n    lv_event_code_t event_code = lv_event_get_code(e);${usesTarget ? 'lv_obj_t * target = lv_event_get_target(e);' : ''}\n`;
    if (this.inComp) s += `lv_obj_t **comp_${this.inComp.id} = lv_event_get_user_data(e);\n`;
    bodies.forEach((b, i) => {
      s += `\nif ( ${conds[i].cond}) {\n${conds[i].pre || ''}${b.acts.map((x) => '      ' + x + '\n').join('')}}`;
    });
    return s + '\n}\n';
  }

  /** warn about custom fonts used by widgets that have no generated source */
  checkFonts() {
    const used = new Set();
    const walk = (n) => {
      for (const sp of (n.properties || []).filter((p) => p.InheritedType === 11)) for (const st of sp.childs || []) for (const c of st.childs || []) if (c.strtype === '_style/Text_Font' && c.strval && !/^(montserrat|unscii|dejavu|simsun)/i.test(c.strval)) used.add(c.strval);
      kids(n).forEach(walk);
    };
    walk(this.data.root);
    for (const f of used) if (!this.fonts.includes(f)) this.warn(`Font source ui_font_${f}.c is missing in assets/`);
  }

  // ------------------------------------------------------------ animations
  async animations() {
    this.imageSets = [];
    const out = [];
    let assetList = null;
    for (const an of this.data.animations || []) {
      if (an.dont_export) continue;
      const fn = str(an, 'FunctionName') || cname(str(an, 'Name')).slice(3) + '_Animation';
      const proto = `lv_anim_t * ${fn}( lv_obj_t *TargetObject, int delay)`;
      let b = `${proto}\n{\nlv_anim_t *out_anim;\n`;
      for (const pa of an.propertyAnimations || []) {
        const V = str(pa, 'VariableName', 'PropertyAnimation_0');
        const cb = str(pa, 'PropertyFunction', 'anim_callback_set_x');
        const set = str(pa, 'ImageSet') || pa.ImageSet || '';
        b += `ui_anim_user_data_t *${V}_user_data = lv_mem_alloc(sizeof(ui_anim_user_data_t));\n${V}_user_data->target = TargetObject;\n`;
        if (set && cb === 'anim_callback_set_image_frame') {
          const name = 'ui_imgset_' + set.replace(/[^A-Za-z0-9_]/g, '_');
          if (!this.imageSets.some((x) => x.name === name)) {
            assetList ||= (await this.opts.listFiles?.()) || [];
            const re = new RegExp('^' + set.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\d+\\.png$', 'i');
            const frames = assetList.filter((f) => re.test(f.split('/').pop())).sort();
            if (!frames.length) this.warn(`Image set frames not found: ${set}`);
            frames.forEach((f) => this.useImage(f));
            this.imageSets.push({ name, frames });
          }
          b += `${V}_user_data->imgset = (${this.v9 ? 'lv_\u200bimg_dsc_t' : 'lv_img_dsc_t'} **)${name};\n${V}_user_data->imgset_size = sizeof(${name})/(sizeof(lv_img_dsc_t*));\n`;
        }
        const infinite = bool(pa, 'LoopInfinite', false);
        b += `${V}_user_data->val = -1;\nlv_anim_t ${V};\nlv_anim_init(&${V});\n`;
        b += `lv_anim_set_time(&${V}, ${int(pa, 'Duration', 0)});\n`;
        b += `lv_anim_set_user_data(&${V}, ${V}_user_data);\n`;
        b += `lv_anim_set_custom_exec_cb(&${V}, _ui_${cb} );\n`;
        b += `lv_anim_set_values(&${V}, ${int(pa, 'StartValue', 0)}, ${int(pa, 'EndValue', 0)} );\n`;
        b += `lv_anim_set_path_cb( &${V}, lv_anim_path_${str(pa, 'Path', 'linear')});\n`;
        b += `lv_anim_set_delay( &${V}, delay + ${int(pa, 'Delay', 0)} );\n`;
        b += `lv_anim_set_deleted_cb( &${V}, _ui_anim_callback_free_user_data );\n`;
        // these three lines come from a CRLF template, so they end in \r\n
        b += `lv_anim_set_playback_time(&${V}, ${int(pa, 'PlaybackTime', 0)});\r\n`;
        b += `lv_anim_set_playback_delay(&${V}, ${int(pa, 'PlaybackDelay', 0)});\r\n`;
        b += infinite ? ` lv_anim_set_repeat_count(&${V}, LV_ANIM_REPEAT_INFINITE );\r\n` : ` lv_anim_set_repeat_count(&${V}, ${int(pa, 'LoopCount', 0)});\r\n`;
        b += `lv_anim_set_repeat_delay(&${V}, ${int(pa, 'LoopDelay', 0)});\n`;
        b += `lv_anim_set_early_apply( &${V}, ${bool(pa, 'EarlyApply', false) ? 'true' : 'false'} );\n`;
        if (!bool(pa, 'AbsoluteReference', true)) b += ` lv_anim_set_get_value_cb(&${V}, &_ui_${cb.replace('_set_', '_get_')} );\n`;
        b += `out_anim = lv_anim_start(&${V});\n`;
      }
      b += `\nreturn out_anim;\n}\n`;
      out.push({ proto, body: b });
    }
    return out;
  }

  // ------------------------------------------------------------ files
  screenFiles(scr) {
    const v = this.v(scr), up = v.slice(3).toUpperCase();
    const body = [], events = [], post = [];
    let vars = [];
    this.widgetBlock(scr, 'NULL', body, vars, events, post);
    const evfn = events.map((n) => this.eventFunction(n));
    // header declarations in tree order; instance children only contribute their event functions
    const vn = (n) => n.axisVar || this.v(n);
    const ext = vars.map((n) => (n.evOnly ? `extern void ui_event_${this.evName(n.evOnly)}( lv_event_t * e);` : (events.includes(n) ? `extern void ui_event_${this.evName(n)}( lv_event_t * e);\n` : '') + `extern lv_obj_t *${vn(n)};`));
    vars = vars.filter((n) => !n.evOnly);
    const H = this.header();
    let c = `${H}\n#include "../ui.h"\n\n${vars.map((n) => `lv_obj_t *${vn(n)} = NULL;`).join('')}\n// event funtions\n`;
    c += evfn.length ? evfn.map((f) => f + '\n').join('') : '\n';
    c += `// build funtions\n\nvoid ${v}_screen_init(void)\n{\n`;
    c += body.join('\n') + '\n';
    const tail = post;
    if (tail.length) c += tail.join('\n') + '\n\n';
    c += `}\n\nvoid ${v}_screen_destroy(void)\n{\n   if (${v}) lv_obj_del(${v});\n\n// NULL screen variables\n${vars.filter((n) => !n.axisVar).map((n) => `${this.v(n)}= NULL;`).join('\n')}\n\n}\n`;

    const h = `${H}\n#ifndef UI_${up}_H\n#define UI_${up}_H\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\n// SCREEN: ${v}\nextern void ${v}_screen_init(void);\nextern void ${v}_screen_destroy(void);\n${ext.join('\n')}\n// CUSTOM VARIABLES\n\n#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n\n`;
    return { c, h };
  }

  async generate() {
    const files = {};
    const H = this.header();
    const proj = this.projectName;
    const guard = '_' + proj.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const screens = kids(this.data.root).filter((n) => T(n) === 'SCREEN');
    const start = T(this.data.root) === 'STARTEVENTS' ? this.data.root : kids(this.data.root).find((n) => T(n) === 'STARTEVENTS');
    const sv = start ? this.v(start) : 'ui____initial_actions0';
    const listed = await this.opts.listFiles?.();
    this.assetFiles = listed ? new Set(listed.map((f) => String(f).replace(/\\/g, '/'))) : null;
    await this.loadThemes();
    const comps = await this.loadComponents();
    const themed = this.themeColors.length > 0;
    if (themed) {
      const t = this.themeFiles(H);
      files['ui_themes.c'] = t.c; files['ui_themes.h'] = t.h;
      files['ui_theme_manager.c'] = this.H.UI_THEME_MANAGER_C; files['ui_theme_manager.h'] = this.H.UI_THEME_MANAGER_H;
    }
    const screenNames = [];
    for (const s of screens) {
      const { c, h } = this.screenFiles(s);
      const base = 'screens/' + this.v(s);
      files[base + '.c'] = c; files[base + '.h'] = h;
      screenNames.push(this.v(s));
    }
    const startEvents = start && this.handlers(start).length ? this.eventFunction(start) : '';
    const compFiles = [];
    for (const comp of comps) {
      this.ensureComponent(comp); // components no screen uses
      files[`components/ui_comp_${comp.file}.c`] = comp.out.c; files[`components/ui_comp_${comp.file}.h`] = comp.out.h;
      compFiles.push(`components/ui_comp_${comp.file}.c`);
    }
    const anims = await this.animations();

    // ---- images
    // every PNG in assets/ is exported (firmware code may switch to images the screens don't use initially)
    if (this.opts.allAssetImages && this.assetFiles) {
      for (const f of [...this.assetFiles].sort()) if (/^assets\/[^/]+\.png$/i.test(f) && !this.images.includes(f)) this.images.push(f);
    }
    const imageFiles = [];
    const depth = this.info.BitDepth || 16;
    if (this.v9 && depth === 8 && this.images.length) this.warn('8-bit images on LVGL 9 are not verified (written as 16-bit)');
    for (const a of this.images) {
      const bytes = await this.opts.readFile(a);
      if (!bytes) { this.warn(`Image file not found: ${a}`); continue; }
      try {
        files[`images/${imageVarName(a)}.c`] = this.v9
          ? await imageSource9(H, a, bytes, depth === 32 ? 32 : 16, this.info.imagebytearrayprefix)
          : await imageSource8(H, a, bytes, depth === 32 ? 32 : depth === 8 ? 8 : 16, false, this.info.imagebytearrayprefix);
        imageFiles.push(`images/${imageVarName(a)}.c`);
      } catch (e) { this.warn(`Image conversion failed (${a}): ${e.message}`); }
    }
    // ---- fonts: ui_font_*.c files in assets/ are exported as they are
    const fontFiles = [];
    const fontSrc = ((await this.opts.listFiles?.()) || []).filter((f) => /^ui_font_.+\.c$/.test(f.split('/').pop()));
    // the font's name is the "codename" of its .fcfg (the file name can differ in case on Windows/macOS)
    const byName = new Map();
    for (const f of fontSrc) {
      let nm = f.split('/').pop().slice(8, -2);
      const cfg = await this.opts.readFile(f.slice(0, -2) + '.fcfg');
      try { if (cfg) nm = JSON.parse(typeof cfg === 'string' ? cfg : new TextDecoder().decode(cfg)).codename || nm; } catch { /* keep the file name */ }
      byName.set(cid(nm), f);   // used as a C identifier and a file name
    }
    this.fonts = [...byName.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const f of this.fonts) {
      const bytes = await this.opts.readFile(byName.get(f));
      if (!bytes) { this.warn(`Cannot read font source: ${byName.get(f)}`); continue; }
      const rel = `fonts/ui_font_${f}.c`;
      files[rel] = bytes;
      fontFiles.push(rel);
    }
    this.checkFonts();

    // ---- ui.h
    let uh = `${H}\n#ifndef ${guard}_UI_H\n#define ${guard}_UI_H\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\n`;
    const inc = this.info.lvgl_include_path || this.opts.boardIncludePath || BOARD_INCLUDE[this.info.board] || '';
    uh += inc ? `    #include "${inc}"\n` : `#if defined __has_include\n  #if __has_include("lvgl.h")\n    #include "lvgl.h"\n  #elif __has_include("lvgl/lvgl.h")\n    #include "lvgl/lvgl.h"\n  #else\n    #include "lvgl.h"\n  #endif\n#else\n  #include "lvgl.h"\n#endif\n`;
    uh += `\n#include "ui_helpers.h"\n${comps.length ? '#include "components/ui_comp.h"\n#include "components/ui_comp_hook.h"\n' : ''}#include "ui_events.h"\n${themed ? '#include "ui_theme_manager.h"\n#include "ui_themes.h"\n' : ''}\n///////////////////// SCREENS ////////////////////\n`;
    uh += screenNames.map((s) => `#include "screens/${s}.h"\n`).join('');
    uh += `\n///////////////////// VARIABLES ////////////////////\n${anims.map((a) => `extern ${a.proto};\n`).join('')}\n// EVENTS\n${startEvents ? `void ui_event_${sv.slice(3)}( lv_event_t * e);\n` : ''}extern lv_obj_t *${sv};\n`;
    if (this.images.length) uh += `\n// IMAGES AND IMAGE SETS\n${this.images.map((a) => `LV_IMG_DECLARE( ${imageVarName(a)});   // ${ccomment(a)}\n`).join('')}`;
    if (this.fonts.length) uh += `\n// FONTS\n${this.fonts.map((f) => `LV_FONT_DECLARE( ui_font_${f});\n`).join('')}`;
    uh += `\n// UI INIT\nvoid ui_init(void);\nvoid ui_destroy(void);\n\n#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n`;
    files['ui.h'] = uh;

    // ---- ui.c
    const dark = this.info.theme_dark !== false;
    let uc = `${H}\n#include "ui.h"\n#include "ui_helpers.h"\n\n///////////////////// VARIABLES ////////////////////\n${anims.map((a) => a.proto + ';\n').join('')}\n// EVENTS\n${startEvents ? `void ui_event_${sv.slice(3)}( lv_event_t * e);\n` : ''}lv_obj_t *${sv};\n\n// IMAGES AND IMAGE SETS\n`;
    uc += this.imageSets.map((st) => `const lv_img_dsc_t *${st.name}[${st.frames.length}] = {${st.frames.map((f) => '&' + imageVarName(f)).join(', ')}};\n`).join('');
    uc += `\n///////////////////// TEST LVGL SETTINGS ////////////////////\n`;
    uc += `#if LV_COLOR_DEPTH != ${depth}\n    #error "LV_COLOR_DEPTH should be ${depth}bit to match the Alite2 Studio settings"\n#endif\n`;
    if (!this.v9) uc += `#if LV_COLOR_16_SWAP !=${this.info.BitDepthSwap ? 1 : 0}\n    #error "LV_COLOR_16_SWAP should be ${this.info.BitDepthSwap ? 1 : 0} to match the Alite2 Studio settings"\n#endif\n`;
    uc += `\n///////////////////// ANIMATIONS ////////////////////\n${anims.map((a) => a.body).join('')}\n///////////////////// FUNCTIONS ////////////////////\n${startEvents}\n///////////////////// SCREENS ////////////////////\n\n`;
    uc += `void ui_init( void )\n{${comps.length ? 'LV_EVENT_GET_COMP_CHILD = lv_event_register_id();\n\n' : '\n'}lv_disp_t *dispp = lv_disp_get_default();\n`;
    uc += this.info.theme_simplified ? `lv_theme_t *theme = lv_theme_basic_init(dispp);\n` : `lv_theme_t *theme = lv_theme_default_init(dispp, lv_palette_main(LV_PALETTE_${PALETTE[this.info.theme_color1 ?? 5] || 'BLUE'}), lv_palette_main(LV_PALETTE_${PALETTE[this.info.theme_color2 ?? 0] || 'RED'}), ${dark ? 'true' : 'false'}, LV_FONT_DEFAULT);\n`;
    uc += `lv_disp_set_theme(dispp, theme);\n`;
    uc += screenNames.map((s) => `${s}_screen_init();\n`).join('');
    uc += `${sv} = lv_obj_create(NULL);\n`;
    // (the initial-actions object is loaded as a screen only with the "Name" naming)
    if (startEvents) uc += `lv_obj_add_event_cb(${sv}, ui_event_${sv.slice(3)}, LV_EVENT_ALL, NULL);\n${this.naming ? '' : `\nlv_disp_load_scr(${sv});\n`}`;
    if (screenNames.length) uc += `lv_disp_load_scr( ${screenNames[0]});\n`;
    uc += `}\n\nvoid ui_destroy( void )\n{${screenNames.map((s) => `${s}_screen_destroy();\n`).join('')}}\n`;
    files['ui.c'] = uc;

    // ---- helpers, events, component hook
    // the generated files so far get the LVGL 9 API names; the static ones below are already written for it
    // (the image set cast keeps the LVGL 8 name; it is marked with a zero-width space so the rename skips it)
    if (this.v9) for (const k of Object.keys(files)) if (typeof files[k] === 'string' && !/^(images|fonts)\/|^ui_theme_manager\./.test(k)) files[k] = api9(files[k]).replace(/\u200b/g, '');
    files['ui_helpers.h'] = H + '\n' + this.H.UI_HELPERS_H.replace(/___PROJ___/g, guard + '_');
    files['ui_helpers.c'] = H + '\n' + this.H.UI_HELPERS_C;
    files['components/ui_comp_hook.c'] = H + '\n' + (comps.length ? '#include "../ui.h"\n\n' + comps.map((c) => `void ui_comp_${c.id}_create_hook( lv_obj_t * comp)\n{\n}\n`).join('\n') : this.H.UI_COMP_HOOK_C);
    if (comps.length) {
      files['components/ui_comp_hook.h'] = `${H}\n#ifndef ${guard}_UI_COMP_HOOK_H\n#define ${guard}_UI_COMP_HOOK_H\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\n${comps.map((c) => `void ui_comp_${c.id}_create_hook( lv_obj_t *comp );\n`).join('')}\n#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n`;
      files['components/ui_comp.h'] = `${H}\n#ifndef _UI_COMP__H\n#define _UI_COMP__H\n\n#include "../ui.h"\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\nvoid get_component_child_event_cb(lv_event_t* e);\nvoid del_component_child_event_cb(lv_event_t* e);\n\nlv_obj_t * ui_comp_get_child(lv_obj_t *comp, uint32_t child_idx);\nextern uint32_t LV_EVENT_GET_COMP_CHILD;\n${comps.map((c) => `#include "ui_comp_${c.file}.h"\n`).join('')}\n#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n`;
      files['components/ui_comp.c'] = H + '\n' + this.H.UI_COMP_C;
    }
    files['ui_events.h'] = `${H}\n#ifndef _UI_EVENTS_H\n#define _UI_EVENTS_H\n\n#ifdef __cplusplus\nextern "C" {\n#endif\n\n${this.functions.length ? this.functions.map(([f]) => `void ${f}(lv_event_t * e);\n`).join('') + '\n' : ''}#ifdef __cplusplus\n} /*extern "C"*/\n#endif\n\n#endif\n`;
    const stubs = this.functions.filter(([, exp]) => exp);
    if (stubs.length && (this.info.callfuncsexport || 'C_FILE') === 'C_FILE') {
      files['ui_events.c'] = `${H}\n#include "ui.h"\n\n${stubs.map(([f]) => `void ${f}(lv_event_t * e)\n{\n\t// Your code here\n}\n`).join('\n')}`;
    }

    // ---- build lists
    const sources = [...compFiles, ...(comps.length ? ['components/ui_comp.c'] : []), ...screenNames.map((s) => `screens/${s}.c`), ...(themed ? ['ui_theme_manager.c', 'ui_themes.c'] : []), 'ui.c', 'components/ui_comp_hook.c', 'ui_helpers.c', ...(files['ui_events.c'] ? ['ui_events.c'] : []), ...imageFiles, ...fontFiles];
    files['CMakeLists.txt'] = `SET(SOURCES ${sources.join('\n    ')})\n\nadd_library(ui \${SOURCES})\n`;
    files['filelist.txt'] = sources.join('\n') + '\n';
    return { files, warnings: this.warnings };
  }
}

/**
 * @param {object} data parsed project
 * @param {{readFile:(rel:string)=>Promise<Uint8Array|null>, findFile?:(name:string)=>Promise<Uint8Array|null>}} opts
 */
export function exportLvgl8(data, opts) { return new Gen(data, opts).generate(); }
