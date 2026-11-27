// Minimal inline SVG icon set (stroke icons, 24x24 viewBox).
const svg = (body, fill = 'none') => `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  zoomIn: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>'),
  zoomOut: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>'),
  fit: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>'),
  fitAll: svg('<rect x="3" y="5" width="7" height="6" rx="1"/><rect x="14" y="5" width="7" height="6" rx="1"/><rect x="3" y="14" width="7" height="6" rx="1"/><rect x="14" y="14" width="7" height="6" rx="1"/>'),
  one: svg('<rect x="5" y="6" width="14" height="12" rx="1"/>'),
  filter: svg('<path d="M4 4h4v4H4zM12 4h4v4h-4zM8 8h4v4H8zM16 8h4v4h-4zM4 12h4v4H4zM12 12h4v4h-4zM8 16h4v4H8zM16 16h4v4h-4z" fill="currentColor" stroke="none"/>'),
  magnet: svg('<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 7h4M14 7h4"/><path d="M10 3v8a2 2 0 0 0 4 0V3"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.3"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  file: svg('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>'),
  save: svg('<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>'),
  chevron: svg('<path d="m9 6 6 6-6 6"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.6H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  play: svg('<path d="M7 4v16l13-8z"/>'),
  upload: svg('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  export: svg('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="m10 12-2 2 2 2M14 12l2 2-2 2"/>'),
  // alignment
  alignLeft: svg('<path d="M4 3v18"/><rect x="7" y="6" width="11" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>'),
  alignCenterH: svg('<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>'),
  alignRight: svg('<path d="M20 3v18"/><rect x="6" y="6" width="11" height="4" rx="1"/><rect x="10" y="14" width="7" height="4" rx="1"/>'),
  alignTop: svg('<path d="M3 4h18"/><rect x="6" y="7" width="4" height="11" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>'),
  alignMiddle: svg('<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>'),
  alignBottom: svg('<path d="M3 20h18"/><rect x="6" y="6" width="4" height="11" rx="1"/><rect x="14" y="10" width="4" height="7" rx="1"/>'),
  distH: svg('<path d="M3 4v16M21 4v16"/><rect x="9" y="7" width="6" height="10" rx="1"/>'),
  distV: svg('<path d="M4 3h16M4 21h16"/><rect x="7" y="9" width="10" height="6" rx="1"/>'),
  sameW: svg('<path d="M4 8h16M4 16h10"/><path d="M4 5v6M20 5v6M4 13v6M14 13v6"/>'),
  sameH: svg('<path d="M8 4v16M16 4v10"/><path d="M5 4h6M5 20h6M13 4h6M13 14h6"/>'),
  front: svg('<rect x="4" y="4" width="10" height="10" rx="1"/><rect x="10" y="10" width="10" height="10" rx="1" fill="currentColor"/>'),
  back: svg('<rect x="10" y="10" width="10" height="10" rx="1"/><rect x="4" y="4" width="10" height="10" rx="1" fill="currentColor"/>'),
};

// Widget type icons
export const WICONS = {
  SCREEN: svg('<rect x="3" y="5" width="18" height="13" rx="1.5"/><path d="M8 21h8"/>'),
  ARC: svg('<path d="M5.6 18.4a9 9 0 1 1 12.8 0"/><path d="M5.6 18.4A9 9 0 0 1 6 5.6" stroke-width="3.4"/>'),
  BUTTON: svg('<rect x="3" y="7" width="18" height="10" rx="3"/><path d="M8 12h8"/>'),
  IMAGE: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  LABEL: svg('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  PANEL: svg('<rect x="3" y="4" width="18" height="16" rx="2"/>'),
  CONTAINER: svg('<rect x="3" y="4" width="18" height="16" rx="1" stroke-dasharray="3 2.5"/>'),
  TEXTAREA: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M15 12v4"/>'),
  TABVIEW: svg('<path d="M3 20V6h6v3h12v11z"/><path d="M9 6h5v3"/>'),
  TABPAGE: svg('<path d="M3 20V8h18v12zM3 8V5h7v3"/>'),
  CALENDAR: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  CHECKBOX: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>'),
  COLORWHEEL: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M21 12h-5M12 21v-5M3 12h5"/>'),
  DROPDOWN: svg('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="m14 11 2 2 2-2"/>'),
  IMGBUTTON: svg('<rect x="3" y="6" width="18" height="12" rx="3"/><path d="m7 15 3-3 2 2 2-2 3 3"/>'),
  KEYBOARD: svg('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10"/>'),
  ROLLER: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 10h14M5 14h14"/>'),
  SLIDER: svg('<path d="M3 12h18"/><circle cx="14" cy="12" r="3" fill="currentColor"/>'),
  SWITCH: svg('<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3" fill="currentColor"/>'),
  SPINBOX: svg('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M3 12h1M20 12h1M10 12h4"/>'),
  BAR: svg('<rect x="2" y="9" width="20" height="6" rx="3"/><rect x="2" y="9" width="12" height="6" rx="3" fill="currentColor"/>'),
  CHART: svg('<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>'),
  SPINNER: svg('<path d="M12 3a9 9 0 1 0 9 9"/>'),
  STARTEVENTS: svg('<path d="M7 4v16l13-8z"/>'),
};

export const icon = (name) => ICONS[name] || '';
export const wicon = (type) => WICONS[type] || WICONS.PANEL;

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
