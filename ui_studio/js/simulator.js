// Simulator ("▶ Play"): runs the current UI like the light does, on a copy of the project.
//
// The key handling (src/Alite2/ui_ScreenState.ino), screen switching and value callbacks (ui_ScreenEvent.ino), the
// default settings (parameters.ino) and the light effects (effect_*.ino) are ported from the firmware. The two push
// dials are F1 (turn = TURN keys, push = F1) and F2 (turn = SECOND keys, push = F2); a push held for 1 s is a long press.
//
// The light pixels are a visual approximation only: colour temperature, hue and wavelength are shown with generic
// colour formulas, not with the light's calibration (Alite2Calib), and the output limits are not applied.
// When you change the key handling in the firmware, change the handlers below too.
import { Project, escapeText, unescapeText } from './project.js';
import { Renderer } from './render.js';
import { h } from './icons.js';

// ---------------------------------------------------------------- firmware constants (common.h)
const K = {
  TURN_DOWN: 1, TURN_UP: 2, TURN_DOWN_FAST: 3, TURN_UP_FAST: 4,
  SECOND_DOWN: 5, SECOND_UP: 6, SECOND_DOWN_FAST: 7, SECOND_UP_FAST: 8,
  F1_UP: 'F1_UP', F2_UP: 'F2_UP', F1_LONG: 'F1_LONG', F2_LONG: 'F2_LONG',
};
const SCR = { CCT: 0, COLOR: 1, MAIN: 2, EFFECT: 3, ARTNET: 4, SETUP: 5, FLIP: 6, QR: 7, MENU: 8 };
const SCREEN_NAME = { [SCR.CCT]: 'ScreenDimming', [SCR.COLOR]: 'ScreenWavelength', [SCR.MAIN]: 'MainScreen', [SCR.EFFECT]: 'ScreenEffect',
  [SCR.ARTNET]: 'ArtnetScreen', [SCR.SETUP]: 'SetupScreen', [SCR.QR]: 'QrScreen', [SCR.MENU]: 'MenuScreen' };
const MIN_KELVIN = 1700, MAX_KELVIN = 20000, MIN_WAVELENGTH = 430, MAX_WAVELENGTH = 675;
const WIRELESS = { OFF: 0, BLE: 1, ARTNET: 2, LUMEN: 3 };
const UPDATE = { UPGRADE: 0, UNDO: 1, FACTORY_RESET: 2, LUMEN_RESET: 3, ENGLISH: 4, KOREAN: 5, JAPANESE: 6 };
const COLOR_HSI = 0, COLOR_WAVE = 1;
const TRIG = { OFF: 0, ON: 1, BLACKOUT: 2 };
const EFFECT = { FIRE: 0, CANDLE: 1, FIREWORK: 2, FLICKER: 3, ACCIDENT: 4, EMERGENCY: 5, WELDING: 6, TV: 7, PULSE: 8, LIGHTNING: 9 };
const TITLES = ['Artnet', 'Bluetooth', 'Lumen radio'];
const TOP_LAYER = ['BarBattery', 'BatteryHead', 'TempLabel', 'BoltImage', 'RadioImage', 'BoostImage'];   // lv_layer_top() in setup()
const LONG_MS = 1000;            // LONG_IKEY_DELAY (20) x 50 ms
const PIXELS = 3;
const LIME = 0, CYAN = 1, RED = 2, AMBER = 3, BLUE = 4;
// approximate colours of the five LED types (Lime, Cyan, Deep red, Amber, Indigo)
const LED_RGB = [[0.72, 1, 0.12], [0, 0.85, 0.85], [1, 0, 0.03], [1, 0.5, 0], [0.22, 0.08, 1]];

const defaultParams = () => ({
  master_intensity: 1, cross_fade: 0, cct_intensity: 1, cct_pos: 0.5, green_magenta: 0,
  dmx_ch: 1, universe: 0, dmx_mode: 17, dmx_bits: 0,
  color: { type: COLOR_HSI, dimming: 1, length: 0.5, hs: { hue: 0, sat: 1 } },
  effect: { dimming: 1, speed: 0.5, no: 0, trig: TRIG.OFF },
  boost: false,
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const random = (a, b) => a + Math.floor(Math.random() * (b - a));   // Arduino random(min, max): min..max-1

// ---------------------------------------------------------------- colour approximations
function kelvinRgb(k) {   // black body colour, normalised to max 1 (Tanner Helland's approximation)
  const t = k / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = [r, g, b].map((v) => clamp(v, 0, 255) / 255);
  const m = Math.max(...c);
  return c.map((v) => v / m);
}
function wavelengthRgb(nm) {   // visible spectrum colour (Dan Bruton's approximation)
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else r = 1;
  return [r, g, b].map((v) => clamp(v, 0, 1));
}
function hsvRgb(H, S) {   // hsiToColor() sectors (5color_wavelength.ino)
  H = ((H % 360) + 360) % 360;
  const frac = H / 60, sector = Math.floor(frac), f = frac - sector;
  const p = 1 - S, q = 1 - S * f, t = 1 - S * (1 - f);
  return [[1, t, p], [q, 1, p], [p, 1, t], [p, q, 1], [t, p, 1], [1, p, q]][sector] || [1, p, q];
}
const scale = (c, k) => c.map((v) => v * k);
const add = (a, b) => a.map((v, i) => v + b[i]);
const ledMix = (ch) => ch.reduce((acc, v, i) => add(acc, scale(LED_RGB[i], v)), [0, 0, 0]);

/** Keys that press a dial: F1 / F2 keys (fn+F1 / fn+F2 on a Mac), 1 / 2, Q / W. Held 1 s = long press. */
export const SIM_KEYS = [
  ['F1  or  1  or  Q', 'Press the F1 dial (hold 1 s = long press)'],
  ['F2  or  2  or  W', 'Press the F2 dial (hold 1 s = long press)'],
  ['← / →', 'Turn the F1 dial'],
  ['↓ / ↑', 'Turn the F2 dial'],
  ['Shift + turn', 'Fast turn'],
  ['Esc', 'Stop the simulator'],
];
function pressKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === 'F1' || e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'KeyQ') return 'F1';
  if (e.key === 'F2' || e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'KeyW') return 'F2';
  return null;
}

export class Simulator {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.layer = null;
  }

  toggle() { if (this.active) this.stop(); else this.start(); }

  // ================================================================ start / stop
  start() {
    const app = this.app;
    if (!app.project) { app.toast('The project is not loaded yet', 'warn'); return; }
    this.fresh();
    this.active = true;
    this.buildLayer();
    this.boot();
    this.render();
    this.loop();
    app.log('Simulator started (F1 / F2: click = press, hold 1 s = long press; turn with the wheel or ◀ ▶)', 'info');
    const b = document.querySelector('.play-btn');
    if (b) { b.classList.add('on'); b.textContent = '■ Stop'; }
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.longTimer);
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('keyup', this.onKeyUp, true);
    this.layer?.remove();
    this.layer = null;
    const b = document.querySelector('.play-btn');
    if (b) { b.classList.remove('on'); b.textContent = '▶ Play'; }
    this.app.log('Simulator stopped', 'info');
  }

  /** A new copy of the project and factory settings (the simulation never changes the real project). */
  fresh() {
    this.p = Project.fromText(this.app.project.serialize());
    this.byName = new Map();
    this.p.walk(this.p.root, (n) => { if (n.saved_objtypeKey !== 'STARTEVENTS') this.byName.set(this.p.name(n), n); });
    this.view = { activeTab: new Map(), revealGuids: new Set() };
    this.slots = new Map();
    this.wifi = { wireless: WIRELESS.ARTNET, lastPage: SCR.MENU, lang: 0 };   // load_wifi_parameters() defaults
    this.delayForAny = 0;
    this.updating = false;
    this.flipped = false;
    this.fx = null;
  }

  /** setup(): slot A, settings to the widgets, first screen. */
  boot() {
    this.slot = 0;
    this.param = this.loadSlot(0);
    this.screen = null;
    this.ui_initSlot();
    this.ui_initScreen();
    this.ui_initGlobalScreen();
    this.switchScreen(this.wifi.lastPage);
    this.delayForAny = 0;
  }

  /** esp_restart(): show it, then start again with the stored settings. */
  restart(why, reset = false) {
    this.flash(why ? `${why}\nRestarting…` : 'Restarting…');
    this.restarting = true;
    setTimeout(() => { if (!this.active) return; this.restarting = false; if (reset) this.fresh(); this.boot(); this.render(); }, 900);
  }

  loadSlot(i) {
    if (!this.slots.has(i)) this.slots.set(i, defaultParams());
    return this.slots.get(i);
  }

  // ================================================================ widget helpers (custom_* in ui_ScreenState.ino)
  w(name) { return this.byName.get(name) || null; }
  now() { return performance.now(); }
  range(n) { return this.p.arr(n, 'Range', [0, 100]); }
  val(n) { return n ? this.p.int(n, 'Value', 0) : 0; }
  setVal(n, v) { this.p.setInt(n, 'Value', v); this.dirty = true; }
  selected(n) { return n ? this.p.int(n, 'Selected', 0) : 0; }
  options(n) { return unescapeText(this.p.str(n, 'Options', '')).split('\n'); }
  tab(n) { return n ? Math.min(this.view.activeTab.get(n.guid) ?? 0, n.children.length - 1) : 0; }
  tabCount(n) { return n ? n.children.length : 1; }
  setHidden(name, v) { const n = this.w(name); if (n) { this.p.setBool(n, 'Hidden', v); this.dirty = true; } }
  labelText(name, text) { const n = this.w(name); if (n) { this.p.setStr(n, 'Text', escapeText(text ?? '')); this.dirty = true; } }

  setArc(name, v) { this.setValue(name, v, false); }
  setSlider(name, v) { this.setValue(name, v, false); }
  setValue(name, v) {
    const n = this.w(name); if (!n || this.updating) return;
    this.updating = true;
    const [min, max] = this.range(n);
    this.setVal(n, clamp(Math.round(v), Math.min(min, max), Math.max(min, max)));
    this.fire(n);
    this.updating = false;
  }
  increment(name, d, wrap = false) {
    const n = this.w(name); if (!n || this.updating) return;
    this.updating = true;
    const [min, max] = this.range(n);
    let v = this.val(n) + d;
    if (wrap) { const r = max - min + 1; while (v < min) v += r; while (v > max) v -= r; }
    else v = clamp(v, min, max);
    this.setVal(n, v);
    this.fire(n);
    this.updating = false;
  }
  setRoller(name, i) {
    const n = this.w(name); if (!n || this.updating) return;
    this.updating = true;
    this.p.setInt(n, 'Selected', i); this.dirty = true;
    this.fire(n);
    this.updating = false;
  }
  setDropdown(name, i, delay) {
    const n = this.w(name); if (!n || this.updating) return;
    if (this.now() - this.delayForAny < delay) return;   // reduce key jitter
    this.updating = true;
    this.p.setInt(n, 'Selected', i); this.dirty = true;
    this.fire(n);
    this.updating = false;
    this.delayForAny = this.now();
  }
  setTab(name, i) {
    const n = this.w(name); if (!n || this.updating) return;
    if (this.now() - this.delayForAny < 200) return;
    this.view.activeTab.set(n.guid, i); this.dirty = true;
    this.delayForAny = this.now();
  }
  setCheckbox(name, v) {
    const n = this.w(name); if (!n || this.p.bool(n, 'Checked') === v) return;
    this.p.setBool(n, 'Checked', v); this.dirty = true;
    this.fire(n);
  }
  checked(name) { const n = this.w(name); return !!n && this.p.bool(n, 'Checked'); }

  /** LV_EVENT_VALUE_CHANGED: run the widget's events from the UI project (text actions + firmware callbacks). */
  fire(node) {
    for (const ev of node.properties || []) {
      if (ev.strtype !== '_event/EventHandler' || ev.strval !== 'VALUE_CHANGED' || ev.disabled) continue;
      for (const a of ev.childs || []) {
        if (a.strtype !== '_event/action') continue;
        const f = (k) => a.childs?.find((c) => c.strtype === `${a.strval}/${k}`)?.strval ?? '';
        if (a.strval === 'SET TEXT VALUE FROM ARC' || a.strval === 'SET TEXT VALUE FROM SLIDER') {
          const target = this.p.get(f('Target'));
          if (target) { this.p.setStr(target, 'Text', escapeText(`${f('Prefix')}${this.val(node)}${f('Postfix')}`)); this.dirty = true; }
        } else if (a.strval === 'CALL FUNCTION') {
          const fn = this.callbacks[f('Function_name')];
          if (fn) fn.call(this, node, this.p.name(node));
        }
      }
    }
  }

  // ================================================================ value callbacks (ui_ScreenEvent.ino)
  get callbacks() {
    return {
      ArcValueChanged(n, name) {
        const v = 0.01 * this.val(n);
        if (name === 'MasterArc') this.param.master_intensity = v;
        else if (name === 'DimmingArc') this.param.cct_intensity = v;
        else if (name === 'WaveDimArc') this.param.color.dimming = v;
      },
      SliderValueChanged(n, name) {
        const v = this.val(n), P = this.param;
        if (name === 'CctSlider') P.cct_pos = (v - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN);
        else if (name === 'GmSlider') P.green_magenta = 0.01 * v;
        else if (name === 'EffectDimSlider') P.effect.dimming = 0.01 * v;
        else if (name === 'EffectSpeedSlider') P.effect.speed = 0.01 * v;
        else if (name === 'CrossSlider') P.cross_fade = 0.01 * v;
        else if (name === 'HueSlider') P.color.hs.hue = v;
        else if (name === 'SatSlider') P.color.hs.sat = 0.01 * v;
        else if (name === 'WaveColorSlider') {
          P.color.length = (v - MIN_WAVELENGTH) / (MAX_WAVELENGTH - MIN_WAVELENGTH);
          const names = [[445, 'Deep Blue'], [455, 'Blue'], [465, 'Vivid Blue'], [475, 'Blue-Cyan'], [485, 'Cyan'], [495, 'Light Cyan'], [505, 'Cyan-Green'],
            [515, 'Aqua'], [525, 'Green'], [535, 'Vivid Green'], [545, 'Yellow-Green'], [555, 'Lime Green'], [565, 'Yellowish Green'], [575, 'Chartreuse'],
            [585, 'Yellow'], [595, 'Golden Yellow'], [605, 'Amber'], [615, 'Orange'], [625, 'Red-Orange'], [635, 'Vermilion'], [645, 'Red'], [655, 'Deep Red']];
          this.labelText('ColorNameLabel', (names.find(([lim]) => v < lim) || [0, 'Magenta'])[1]);
        }
      },
      RollerValueChanged(n, name) {
        if (name === 'EffectRoller') { this.param.effect.no = this.selected(n); this.fx = null; }
        else if (name === 'SlotRoller') {
          this.slot = this.selected(n);
          this.param = this.loadSlot(this.slot);
          this.ui_initScreen();
        }
      },
      ArtnetArcValueChanged(n, name) {
        if (name === 'DmxChArc') this.param.dmx_ch = this.val(n);
        else if (name === 'UniverseSlider') this.param.universe = this.val(n);
        this.labelText('MessageLabel', `Pree and hold\nF2 to turn off\nwireless\n\nCH:${this.param.dmx_ch}  U:${this.param.universe}\n`);
      },
      DropdownValueChanged(n, name) {
        const v = this.selected(n);
        if (name === 'DmxModeDropdown') this.param.dmx_mode = v <= 16 ? v : v + 2;
        else if (name === 'DmxBitsDropdown') this.param.dmx_bits = v;
        else if (name === 'TrigDropdown') { this.param.effect.trig = v; this.fx = null; }
      },
      BoostCheckboxChanged(n) { this.param.boost = this.p.bool(n, 'Checked'); },
    };
  }

  // ================================================================ init / screens (ui_ScreenState.ino, ui_ScreenEvent.ino)
  ui_initSlot() { this.setRoller('SlotRoller', this.slot); }

  ui_initScreen() {
    const P = this.param;
    this.updating = false;
    this.setArc('MasterArc', P.master_intensity * 100);
    this.setSlider('CrossSlider', P.cross_fade * 100);
    this.setArc('DimmingArc', P.cct_intensity * 100);
    const cct = this.w('CctSlider'); if (cct) this.p.setArr(cct, 'Range', [MIN_KELVIN, MAX_KELVIN]);
    this.setSlider('CctSlider', P.cct_pos * (MAX_KELVIN - MIN_KELVIN) + MIN_KELVIN);
    this.setSlider('GmSlider', P.green_magenta * 100);
    this.setArc('WaveDimArc', P.color.dimming * 100);
    this.setSlider('HueSlider', P.color.hs.hue);
    this.setSlider('SatSlider', P.color.hs.sat * 100);
    const wave = this.w('WaveColorSlider'); if (wave) this.p.setArr(wave, 'Range', [MIN_WAVELENGTH, MAX_WAVELENGTH]);
    this.setSlider('WaveColorSlider', P.color.length * (MAX_WAVELENGTH - MIN_WAVELENGTH) + MIN_WAVELENGTH);
    this.setSlider('EffectDimSlider', P.effect.dimming * 100);
    this.setSlider('EffectSpeedSlider', P.effect.speed * 100);
    this.setRoller('EffectRoller', P.effect.no);
    this.setDropdown('TrigDropdown', P.effect.trig, 0);
    this.setArc('DmxChArc', P.dmx_ch);
    this.setSlider('UniverseSlider', P.universe);
    this.setDropdown('DmxModeDropdown', P.dmx_mode > 18 ? P.dmx_mode - 2 : P.dmx_mode, 0);
    this.setDropdown('DmxBitsDropdown', P.dmx_bits, 0);
    this.setCheckbox('BoostCheckbox', P.boost);
  }

  ui_initGlobalScreen() {
    this.updating = false;
    this.setDropdown('ArtnetDropdown', this.wifi.wireless, 0);
  }

  set_color_type_by_tab() {
    const tv = this.w('ColorTabView'); if (!tv) return;
    const wave = this.tab(tv) === 2;
    this.setHidden('HueLabel', wave);
    this.setHidden('SatLabel', wave);
    this.setHidden('WaveColorLabel', !wave);
    this.param.color.type = wave ? COLOR_WAVE : COLOR_HSI;
  }

  switchScreen(index) {
    this.wifi.lastPage = SCR.MENU;
    if (index === SCR.CCT) this.setSlider('CrossSlider', 0);
    if (index === SCR.COLOR) { this.setSlider('CrossSlider', 100); this.set_color_type_by_tab(); }
    const name = SCREEN_NAME[index];
    if (!name || !this.w(name)) return;
    this.screen = name;
    if (![SCR.QR, SCR.MENU].includes(index)) this.wifi.lastPage = index;
    this.delayForAny = this.now();
    this.dirty = true;
  }

  setScreenWithIndex(index) {
    if (this.updating) return;
    if (this.now() - this.delayForAny < 300) return;
    if (this.screen === 'MessageScreen') return;
    this.switchScreen(index);
  }

  switch_boost() {
    if (this.checked('BoostCheckbox')) this.setCheckbox('BoostCheckbox', false);
    else this.setCheckbox('BoostCheckbox', true);   // battery is always fine in the simulator
  }

  // ================================================================ key handling per screen (ui_ScreenState.ino)
  key(k) {
    if (!this.active || this.restarting) return;
    const fn = {
      MenuScreen: this.menuState, MainScreen: this.mainState, ScreenDimming: this.dimmingState, ArtnetScreen: this.artnetState,
      ScreenWavelength: this.wavelengthState, ScreenEffect: this.effectState, SetupScreen: this.setupState, QrScreen: this.qrState,
      MessageScreen: this.messageState,
    }[this.screen];
    fn?.call(this, k);
    if (this.dirty) this.render();
  }

  rollerStep(name, d) {
    if (this.now() - this.delayForAny < 200) return;
    const n = this.w(name); if (!n) return;
    const s = this.selected(n), cnt = this.options(n).length;
    if (d < 0 && s > 0) this.setRoller(name, s - 1);
    if (d > 0 && s < cnt - 1) this.setRoller(name, s + 1);
    this.delayForAny = this.now();
  }
  dropdownStep(name, d) {
    const n = this.w(name); if (!n) return;
    const v = this.selected(n), cnt = this.options(n).length;
    if (d < 0 && v > 0) this.setDropdown(name, v - 1, 500);
    if (d > 0 && v < cnt - 1) this.setDropdown(name, v + 1, 500);
  }
  nextTab(name) { const n = this.w(name); if (n) this.setTab(name, (this.tab(n) + 1) % this.tabCount(n)); }

  menuState(k) {
    const sel = this.selected(this.w('MenuRoller'));
    if ([K.SECOND_DOWN, K.SECOND_DOWN_FAST, K.TURN_DOWN, K.TURN_DOWN_FAST].includes(k)) this.rollerStep('MenuRoller', -1);
    else if ([K.SECOND_UP, K.SECOND_UP_FAST, K.TURN_UP, K.TURN_UP_FAST].includes(k)) this.rollerStep('MenuRoller', 1);
    else if (k === K.F1_UP || k === K.F2_UP) {
      if (sel === SCR.FLIP) { this.flipped = !this.flipped; this.dirty = true; } else this.setScreenWithIndex(sel);
    } else if (k === K.F2_LONG) this.switch_boost();
  }

  mainState(k) {
    const m = { [K.SECOND_DOWN]: ['MasterArc', -1], [K.SECOND_DOWN_FAST]: ['MasterArc', -10], [K.SECOND_UP]: ['MasterArc', 1], [K.SECOND_UP_FAST]: ['MasterArc', 10],
      [K.TURN_DOWN]: ['CrossSlider', -1], [K.TURN_DOWN_FAST]: ['CrossSlider', -10], [K.TURN_UP]: ['CrossSlider', 1], [K.TURN_UP_FAST]: ['CrossSlider', 10] }[k];
    if (m) this.increment(m[0], m[1]);
    else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
    else if (k === K.F2_LONG) this.switch_boost();
  }

  dimmingState(k) {
    const tab = this.tab(this.w('CCTTabView'));
    const arc = { [K.SECOND_DOWN]: -1, [K.SECOND_DOWN_FAST]: -10, [K.SECOND_UP]: 1, [K.SECOND_UP_FAST]: 10 }[k];
    const turn = { [K.TURN_DOWN]: [-100, -1], [K.TURN_DOWN_FAST]: [-1000, -10], [K.TURN_UP]: [100, 1], [K.TURN_UP_FAST]: [1000, 10] }[k];
    if (arc) this.increment('DimmingArc', arc);
    else if (turn) { if (tab === 0) this.increment('CctSlider', turn[0]); else if (tab === 1) this.increment('GmSlider', turn[1]); }
    else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
    else if (k === K.F1_UP) this.nextTab('CCTTabView');
    else if (k === K.F2_LONG) this.switch_boost();
  }

  artnetState(k) {
    const tab = this.tab(this.w('ArtnetTabView'));
    const arc = { [K.SECOND_DOWN]: -1, [K.SECOND_DOWN_FAST]: -50, [K.SECOND_UP]: 1, [K.SECOND_UP_FAST]: 50 }[k];
    const d = { [K.TURN_DOWN]: -1, [K.TURN_DOWN_FAST]: -1, [K.TURN_UP]: 1, [K.TURN_UP_FAST]: 1 }[k];
    if (arc) this.increment('DmxChArc', arc);
    else if (d) {
      if (tab === 0) this.increment('UniverseSlider', d);
      else if (tab === 1) this.dropdownStep('DmxModeDropdown', d);
      else if (tab === 2) this.dropdownStep('DmxBitsDropdown', d);
    } else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
    else if (k === K.F1_UP) this.nextTab('ArtnetTabView');
  }

  wavelengthState(k) {
    const tab = this.tab(this.w('ColorTabView'));
    const arc = { [K.SECOND_DOWN]: -1, [K.SECOND_DOWN_FAST]: -10, [K.SECOND_UP]: 1, [K.SECOND_UP_FAST]: 10 }[k];
    const turn = { [K.TURN_DOWN]: [-1, -1, -5], [K.TURN_DOWN_FAST]: [-30, -10, -50], [K.TURN_UP]: [1, 1, 5], [K.TURN_UP_FAST]: [30, 10, 50] }[k];
    if (arc) this.increment('WaveDimArc', arc);
    else if (turn) {
      if (tab === 0) this.increment('HueSlider', turn[0], true);
      else if (tab === 1) this.increment('SatSlider', turn[1]);
      else if (tab === 2) this.increment('WaveColorSlider', turn[2], true);
    } else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
    else if (k === K.F1_UP) { this.nextTab('ColorTabView'); this.set_color_type_by_tab(); }
    else if (k === K.F2_LONG) this.switch_boost();
  }

  effectState(k) {
    const tab = this.tab(this.w('EffectTabView'));
    if ([K.SECOND_DOWN, K.SECOND_DOWN_FAST].includes(k)) this.rollerStep('EffectRoller', -1);
    else if ([K.SECOND_UP, K.SECOND_UP_FAST].includes(k)) this.rollerStep('EffectRoller', 1);
    else if ([K.TURN_DOWN, K.TURN_DOWN_FAST, K.TURN_UP, K.TURN_UP_FAST].includes(k)) {
      const up = k === K.TURN_UP || k === K.TURN_UP_FAST, fast = k === K.TURN_DOWN_FAST || k === K.TURN_UP_FAST;
      const d = (up ? 1 : -1) * (fast ? 10 : 1);
      if (tab === 0) this.dropdownStep('TrigDropdown', up ? 1 : -1);
      else if (tab === 1) this.increment('EffectDimSlider', d);
      else if (tab === 2) this.increment('EffectSpeedSlider', d);
    } else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
    else if (k === K.F1_UP) this.nextTab('EffectTabView');
  }

  setupState(k) {
    const tab = this.tab(this.w('SetupTabView'));
    if ([K.TURN_DOWN, K.TURN_DOWN_FAST, K.TURN_UP, K.TURN_UP_FAST].includes(k)) {
      const d = k === K.TURN_UP || k === K.TURN_UP_FAST ? 1 : -1;
      if (tab === 0) this.rollerStep('SlotRoller', d);
      else if (tab === 1) this.dropdownStep('ArtnetDropdown', d);
      else if (tab === 2) this.dropdownStep('UpdateDropdown', d);
    } else if (k === K.F1_UP) this.nextTab('SetupTabView');
    else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
    else if (k === K.F2_LONG) {
      if (tab === 1) {
        const sel = this.selected(this.w('ArtnetDropdown'));
        if (sel === WIRELESS.LUMEN) { this.labelText('IpLabel', 'No Lumen Device\nis detected'); return; }   // no module in the simulator
        this.wifi.wireless = sel;
        this.restart(`Radio: ${this.options(this.w('ArtnetDropdown'))[sel] || sel}`);
      } else if (tab === 2) {
        const sel = this.selected(this.w('UpdateDropdown'));
        if (sel === UPDATE.UPGRADE) this.labelText('FirmwareLabel', 'WiFi has to\nbe connected');
        else if (sel === UPDATE.UNDO) this.labelText('FirmwareLabel', 'No previous\nfirmware found');
        else if (sel === UPDATE.FACTORY_RESET) { this.wifi.wireless = WIRELESS.BLE; this.restart('Factory reset'); }
        else if (sel === UPDATE.LUMEN_RESET) { /* no Lumen module */ }
        else if (sel >= UPDATE.ENGLISH) { this.wifi.lang = sel - UPDATE.ENGLISH; this.restart(['English', 'Korean (shown in English here)', 'Japanese (shown in English here)'][this.wifi.lang]); }
      }
    }
  }

  qrState(k) {
    if (k === K.F1_UP) this.nextTab('QrTabView');
    else if (k === K.F2_UP) this.setScreenWithIndex(SCR.MENU);
  }

  messageState(k) {
    const title = unescapeText(this.p.str(this.w('TitleLabel'), 'Text', ''));
    const wireless = TITLES.includes(title);
    const arc = { [K.SECOND_DOWN]: -1, [K.SECOND_DOWN_FAST]: -50, [K.SECOND_UP]: 1, [K.SECOND_UP_FAST]: 50 }[k];
    if (arc && (title === TITLES[0] || title === TITLES[2])) this.increment('DmxChArc', arc);
    else if ([K.TURN_DOWN, K.TURN_DOWN_FAST].includes(k) && title === TITLES[0]) this.increment('UniverseSlider', -1);
    else if ([K.TURN_UP, K.TURN_UP_FAST].includes(k) && title === TITLES[0]) this.increment('UniverseSlider', 1);
    else if (k === K.F2_LONG && wireless) { this.wifi.wireless = WIRELESS.OFF; this.restart('Wireless off'); }
  }

  // ================================================================ light output (led_pwm.ino, effect_*.ino)
  /** updateLocalLED(): one colour for all pixels, as linear RGB (1 = full output). */
  localRgb(master = this.param.master_intensity) {
    const P = this.param;
    const kelvin = P.cct_pos * (MAX_KELVIN - MIN_KELVIN) + MIN_KELVIN;
    const crossWhite = 1 - P.cross_fade;
    const whiteI = crossWhite * P.cct_intensity * master;
    let white = scale(kelvinRgb(kelvin), whiteI);
    const gm = P.green_magenta * 0.5 * whiteI;
    if (gm > 0) white = add(white, [0, gm, 0]); else if (gm < 0) white = add(white, [-gm * 0.8, 0, -gm]);
    const colorI = P.cross_fade * P.color.dimming * master;
    const color = P.color.type === COLOR_WAVE
      ? wavelengthRgb(P.color.length * (MAX_WAVELENGTH - MIN_WAVELENGTH) + MIN_WAVELENGTH)
      : hsvRgb(P.color.hs.hue, P.color.hs.sat);
    return add(white, scale(color, colorI));
  }
  effectIntensity() { return this.param.effect.dimming * this.param.master_intensity; }   // get_effect_intensity() without the output limit

  /** RGB of each pixel now. Effects advance in 10 ms steps (about one firmware loop). */
  pixels(dtMs) {
    const P = this.param;
    if (P.effect.trig === TRIG.BLACKOUT) return Array.from({ length: PIXELS }, () => [0, 0, 0]);
    if (P.effect.trig !== TRIG.ON) { const c = this.localRgb(); return Array.from({ length: PIXELS }, () => c); }
    const no = P.effect.no;
    if (!this.fx || this.fx.no !== no) this.fx = { no, t0: this.now(), px: Array.from({ length: 4 }, () => ({})) };
    const steps = Math.max(1, Math.min(20, Math.round(dtMs / 10)));
    let out = null;
    for (let s = 0; s < steps; s++) out = this.effectStep(no, this.fx);
    return out;
  }

  effectStep(no, fx) {
    const P = this.param, speed = clamp(P.effect.speed, 0, 1), now = this.now(), I = this.effectIntensity();
    const px = fx.px, out = [];
    const kel = (intensity, k) => scale(kelvinRgb(k), intensity);
    for (let i = 0; i < PIXELS; i++) {
      const st = px[i];
      switch (no) {
        case EFFECT.FIRE: {
          st.t ??= [0, 100, 30, 60][i]; st.scale ??= 0.8 + random(0, 41) / 100;
          const sp = Math.max(0.01, speed), s = 0.2 + sp * 1.2;
          st.t += 0.025 * s * st.scale * (1 + random(-5, 6) * 0.01);
          const flicker = Math.sin(st.t) + Math.sin(st.t * 0.6 + i);
          const inten = clamp(0.5 + flicker * 0.25 + random(-10, 11) / 100, 0, 1);
          const k = clamp(2200 + flicker * 300 + random(-20, 21), 1700, 3000);
          out.push(kel(inten * I, k)); break;
        }
        case EFFECT.CANDLE: {
          st.t ??= [0, 100, 30, 60][i];
          st.t += 0.03 * (0.1 + speed * 0.6 + random(-5, 6) / 100);
          const flicker = Math.sin(st.t) + 0.4 * Math.sin(st.t * 1.7 + i) + 0.3 * Math.sin(st.t * 2.5 + random(0, 1000) / 1000);
          const inten = clamp(0.5 + flicker * 0.2 + random(-12, 13) / 100, 0, 1);
          const k = clamp(Math.trunc(1700 + flicker * 100 + random(-30, 31)), 1700, 2200);
          out.push(kel(inten * I, k)); break;
        }
        case EFFECT.FIREWORK: case EFFECT.TV: {
          st.ch ??= Array.from({ length: 5 }, () => ({ b: 0, target: no === EFFECT.TV ? 0 : 1, prog: 1, spd: 0.01, next: now + (no === EFFECT.TV ? random(100, 1000) : random(500, 3000)) }));
          const ch = st.ch.map((c, j) => {
            if (no === EFFECT.FIREWORK) {
              if (now >= c.next) { c.target = random(60, 100) / 100; c.prog = 0; c.spd = (0.005 + random(5, 25) / 10000) * 0.33; c.next = now + random(1000, 4000) * (1.5 - speed); }
              if (c.prog < 1) c.prog = Math.min(1, c.prog + c.spd);
              c.b = c.target * (1 - Math.pow(c.prog, 1.5));
              return c.b * I;
            }
            if (now >= c.next) {
              let base = random(7, 35) / 100; if (j === 0 || j === 4) base += random(0, 20) / 100;
              c.target = Math.min(base, 1); c.prog = 0; c.spd = (0.002 + random(2, 10) / 10000) * (0.15 + speed * 0.5); c.next = now + random(200, 1000);
            }
            if (c.prog < 1) c.prog = Math.min(1, c.prog + c.spd);
            const t = Math.pow(c.prog, 2);
            c.b = c.b * (1 - t) + c.target * t;
            return c.b * 0.7 * I;
          });
          out.push(ledMix(ch)); break;
        }
        case EFFECT.FLICKER: {
          st.next ??= 0;
          if (now >= st.next) {
            if (st.on) {
              st.burst--;
              if (st.burst <= 0) { st.on = false; const mn = Math.trunc(4000 - 3000 * speed); st.next = now + random(mn, mn + 2000); }
              else st.next = now + random(40, 100);
            } else { st.on = true; st.burst = random(1, 4); st.next = now + random(40, 100); }
          }
          out.push(scale(this.localRgb(), st.on ? 0 : clamp(P.effect.dimming, 0, 1))); break;
        }
        case EFFECT.ACCIDENT: {
          const interval = 250 - (250 - 60) * speed;
          st.timer ??= 0; st.step ??= 0;
          if (now - st.timer > interval) { st.step++; st.timer = now; }
          const pat = i % 2 === 0 ? [2, -1, 2, -1, 4, -1, 4, -1] : [2, 4, -1, 2, 4, -1];
          const c = pat[st.step % pat.length], ch = [0, 0, 0, 0, 0];
          if (c >= 0) ch[c] = I;
          out.push(ledMix(ch)); break;
        }
        case EFFECT.EMERGENCY: {
          const interval = 600 - (600 - 150) * speed;
          st.timer ??= 0;
          if (now - st.timer > interval) { st.on = !st.on; st.timer = now; }
          const ch = [0, 0, 0, 0, 0]; if (st.on) ch[RED] = I;   // pwm[2] = RED_INDEX
          out.push(ledMix(ch)); break;
        }
        case EFFECT.WELDING: {
          if (!fx.lastFlicker || now - fx.lastFlicker >= 30) { fx.toggle = !fx.toggle; fx.lastFlicker = now; }
          if (i % 2 === 1) out.push(kel((i === 1) === fx.toggle ? I : 0, 20000));
          else {
            if (!st.active) { st.active = true; st.start = now; st.dur = random(200, 500); }
            const el = now - st.start;
            if (el >= st.dur) { st.active = false; out.push([0, 0, 0]); } else out.push(kel(I * (1 - el / st.dur), 1700));
          }
          break;
        }
        case EFFECT.PULSE: {
          if (i === 0) { fx.phase = (fx.phase || 0) + (0.002 + speed * 0.058) / 2; if (fx.phase > 2 * Math.PI) fx.phase -= 2 * Math.PI; }
          const wave = 0.5 + 0.5 * Math.sin(fx.phase || 0);
          out.push(this.localRgb(clamp(P.master_intensity * wave, 0, 1) * I)); break;
        }
        case EFFECT.LIGHTNING: {   // effect_lightning.ino
          if (i === 0) {
            const ls = (fx.ls ??= { inStrike: false, on: false, left: 0, next: 0, off: 0, tau: 40, k: 7500, peak: [0, 0, 0, 0], level: [0, 0, 0, 0] });
            if (now >= ls.next) {
              if (!ls.inStrike) {
                ls.inStrike = true; ls.left = random(2, 6); ls.k = random(6500, 9500);
                if (random(0, 100) < 35) {
                  ls.peak = [0, 0, 0, 0];
                  const p = random(0, PIXELS), pk = random(20, 51) / 100;
                  ls.peak[p] = pk; if (random(0, 2) && p + 1 < PIXELS) ls.peak[p + 1] = pk * 0.7;
                } else ls.peak = ls.peak.map(() => random(70, 101) / 100);
              }
              if (!ls.on) { ls.on = true; ls.level = ls.peak.map((pk) => pk * random(55, 101) / 100); ls.left--; ls.next = now + random(30, 90); }
              else {
                ls.on = false; ls.off = now;
                if (ls.left > 0) { ls.tau = random(20, 60); ls.next = now + random(30, 160); }
                else { ls.inStrike = false; ls.tau = random(120, 400); const mn = Math.trunc(300 + 6000 * (1 - speed) ** 2); ls.next = now + random(mn, mn * 2); }
              }
            }
            fx.fade = ls.on ? 1 : Math.exp(-(now - ls.off) / ls.tau);
          }
          out.push(kel(fx.ls.level[i] * fx.fade * I, fx.ls.k)); break;
        }
        default: out.push([0, 0, 0]);
      }
    }
    return out;
  }

  // ================================================================ view
  buildLayer() {
    const vp = document.getElementById('canvas-viewport');
    const dial = (id, label, title) => {
      const knob = h('div', { class: 'sim-knob', title: `${title}: click = press ${id}, hold 1 s = long press, mouse wheel / drag = turn` }, h('div', { class: 'sim-knob-mark' }), h('span', {}, id));
      const btn = (txt, dir, t) => h('button', { class: 'sim-turn', title: t, onclick: (e) => this.turn(id, dir, e.shiftKey) }, txt);
      this.bindKnob(knob, id);
      return h('div', { class: 'sim-dial' },
        h('div', { class: 'sim-dial-label' }, label),
        h('div', { class: 'sim-dial-row' }, btn('◀', -1, 'Turn left (Shift: fast)'), knob, btn('▶', 1, 'Turn right (Shift: fast)')));
    };
    this.lcd = h('div', { class: 'sim-lcd' });
    this.lcdWrap = h('div', { class: 'sim-lcd-wrap' }, this.lcd);
    this.pixelEls = Array.from({ length: PIXELS }, (_, i) => h('div', { class: 'sim-pixel' }, h('div', { class: 'sim-pixel-glow' }), h('span', { class: 'sim-pixel-name' }, `Pixel ${i + 1}`)));
    this.readout = h('div', { class: 'sim-readout' });
    this.layer = h('div', { class: 'sim-layer' },
      h('div', { class: 'sim-controls' },
        h('div', { class: 'sim-title' }, 'SIMULATOR'),
        dial('F2', 'F2 dial', 'Dial F2'),
        dial('F1', 'F1 dial', 'Dial F1'),
        h('div', { class: 'sim-help' }, h('b', {}, 'Keyboard'), h('br'), 'F1 / 1 / Q = press F1', h('br'), 'F2 / 2 / W = press F2', h('br'), '(hold 1 s = long press)', h('br'), '← → turn F1, ↓ ↑ turn F2', h('br'), 'Shift = fast turn'),
        h('button', { class: 'btn small', title: 'Start again with the current UI and factory settings', onclick: () => this.restart('Reset to factory settings', true) }, 'Reset')),
      this.lcdWrap,
      h('div', { class: 'sim-light' },
        h('div', { class: 'sim-title' }, 'LIGHT'),
        h('div', { class: 'sim-pixels' }, this.pixelEls),
        this.readout,
        h('div', { class: 'sim-note' }, 'Approximate colours: the real output uses the light\'s calibration and output limits.')));
    // the editor canvas underneath must not pan, zoom or select while the simulator is shown
    for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel']) this.layer.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'wheel' || ev === 'contextmenu') e.preventDefault(); }, ev === 'wheel' ? { passive: false } : undefined);
    vp.append(this.layer);
    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => this.keyUp(e);
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('keyup', this.onKeyUp, true);
  }

  bindKnob(knob, id) {
    knob.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      knob.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY, a: null, moved: false };
      const cx = () => { const r = knob.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      const angle = (ev) => { const [x, y] = cx(); return Math.atan2(ev.clientY - y, ev.clientX - x) * 180 / Math.PI; };
      start.a = angle(e);
      this.press(id, true);
      const move = (ev) => {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6 && !start.moved) return;
        if (!start.moved) { start.moved = true; this.press(id, false, true); }   // dragging turns, no press
        let d = angle(ev) - start.a;
        if (d > 180) d -= 360; if (d < -180) d += 360;
        if (Math.abs(d) >= 15) { this.turn(id, d > 0 ? 1 : -1, ev.shiftKey); start.a = angle(ev); }
      };
      const up = () => { knob.removeEventListener('pointermove', move); knob.removeEventListener('pointerup', up); knob.removeEventListener('pointercancel', up); if (!start.moved) this.press(id, false); };
      knob.addEventListener('pointermove', move);
      knob.addEventListener('pointerup', up);
      knob.addEventListener('pointercancel', up);
    });
    knob.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelAcc = (this.wheelAcc || 0) + e.deltaY;
      while (Math.abs(this.wheelAcc) >= 40) { const d = this.wheelAcc < 0 ? 1 : -1; this.turn(id, d, e.shiftKey || Math.abs(e.deltaY) > 120); this.wheelAcc -= -d * 40; }
    }, { passive: false });
  }

  /** Push of a dial: release before 1 s = KEY_UP, held 1 s = KEY_LONG (once, nothing on release). */
  press(id, down, cancel = false) {
    if (down) {
      this.pressed = { id, long: false };
      this.layer.querySelectorAll('.sim-knob').forEach((k) => k.classList.toggle('down', k.textContent === id));
      clearTimeout(this.longTimer);
      this.longTimer = setTimeout(() => { if (this.pressed?.id === id) { this.pressed.long = true; this.key(id === 'F1' ? K.F1_LONG : K.F2_LONG); } }, LONG_MS);
      return;
    }
    clearTimeout(this.longTimer);
    this.layer?.querySelectorAll('.sim-knob').forEach((k) => k.classList.remove('down'));
    const p = this.pressed; this.pressed = null;
    if (!cancel && p && p.id === id && !p.long) this.key(id === 'F1' ? K.F1_UP : K.F2_UP);
  }

  /** Turning a dial (disabled while it is pressed, like the firmware). Right = up. */
  turn(id, dir, fast) {
    if (this.pressed?.id === id) return;
    const k = id === 'F1'
      ? (dir > 0 ? (fast ? K.TURN_UP_FAST : K.TURN_UP) : (fast ? K.TURN_DOWN_FAST : K.TURN_DOWN))
      : (dir > 0 ? (fast ? K.SECOND_UP_FAST : K.SECOND_UP) : (fast ? K.SECOND_DOWN_FAST : K.SECOND_DOWN));
    const knob = [...this.layer.querySelectorAll('.sim-knob')].find((x) => x.textContent === id);
    if (knob) { knob.dataset.rot = (+(knob.dataset.rot || 0) + dir * (fast ? 45 : 15)); knob.querySelector('.sim-knob-mark').style.transform = `rotate(${knob.dataset.rot}deg)`; }
    this.key(k);
  }

  keyDown(e) {
    if (!this.active || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const map = { ArrowLeft: ['F1', -1], ArrowRight: ['F1', 1], ArrowDown: ['F2', -1], ArrowUp: ['F2', 1] };
    if (map[e.key]) { e.preventDefault(); e.stopPropagation(); this.turn(map[e.key][0], map[e.key][1], e.shiftKey); return; }
    const dial = pressKey(e);
    if (dial) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) this.press(dial, true); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.stop(); }
  }
  keyUp(e) {
    if (!this.active) return;
    const dial = pressKey(e);
    if (dial) { e.preventDefault(); e.stopPropagation(); this.press(dial, false); }
  }

  flash(text) {
    this.flashText = text;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => { this.flashText = ''; this.render(); }, 1400);
    this.render();
  }

  /** Paint the current screen and, like lv_layer_top(), the status icons of MainScreen above it. */
  render() {
    if (!this.layer) return;
    this.dirty = false;
    const vp = this.layer;
    const sc = clamp(Math.floor(Math.min((vp.clientHeight - 60) / this.p.height, (vp.clientWidth - 520) / this.p.width) * 4) / 4, 1, 3);
    this.lcdWrap.style.width = this.p.width * sc + 'px';
    this.lcdWrap.style.height = this.p.height * sc + 'px';
    this.lcd.style.width = this.p.width + 'px';
    this.lcd.style.height = this.p.height + 'px';
    this.lcd.style.transform = `scale(${sc})`;
    this.lcdWrap.style.transform = this.flipped ? 'rotate(180deg)' : '';   // Menu > Flip screen
    this.lcd.textContent = '';
    this.setHidden('BoostImage', !this.param.boost);
    this.setHidden('BoltImage', true);
    this.dirty = false;
    const screen = this.w(this.screen);
    if (screen) new Renderer(this.p, this.app.assets, this.view).renderScreen(screen, (el) => this.lcd.append(el));
    const main = this.w('MainScreen');
    if (main && this.screen !== 'MainScreen') {
      const top = new Renderer(this.p, this.app.assets, this.view).renderScreen(main, (el) => { el.classList.add('sim-top'); this.lcd.append(el); });
      for (const name of TOP_LAYER) { const n = this.w(name); const el = n && top.querySelector(`[data-guid="${n.guid}"]`); if (el) el.classList.add('sim-top-show'); }
    }
    if (this.flashText) this.lcd.append(h('div', { class: 'sim-flash' }, this.flashText));
    this.paintLight(0);
  }

  loop() {
    let last = this.now();
    const tick = () => {
      if (!this.active) return;
      const t = this.now();
      if (this.param.effect.trig === TRIG.ON) this.paintLight(t - last);
      last = t;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  paintLight(dt) {
    if (!this.layer) return;
    const px = this.pixels(dt);
    px.forEach((rgb, i) => {
      const lvl = Math.max(...rgb, 0);
      const el = this.pixelEls[i];
      if (lvl <= 0.002) { el.style.background = '#111316'; el.firstChild.style.opacity = '0'; return; }
      const chroma = rgb.map((v) => Math.max(0, v) / lvl);
      const b = 0.12 + 0.88 * Math.pow(Math.min(lvl, 1), 0.45);   // perceived brightness
      const col = `rgb(${chroma.map((v) => Math.round(255 * Math.pow(v, 1 / 2.2) * b)).join(',')})`;
      el.style.background = col;
      el.firstChild.style.opacity = String(Math.min(1, lvl));
      el.firstChild.style.boxShadow = `0 0 ${10 + 16 * Math.min(lvl, 1)}px ${2 + 4 * Math.min(lvl, 1)}px ${col}`;
    });
    const P = this.param;
    const kelvin = Math.round(P.cct_pos * (MAX_KELVIN - MIN_KELVIN) + MIN_KELVIN);
    const pct = (v) => Math.round(v * 100) + '%';
    const effects = this.options(this.w('EffectRoller'));
    const lines = P.effect.trig === TRIG.BLACKOUT ? ['Blackout (Effects → Trig)']
      : P.effect.trig === TRIG.ON ? [`Effect ${effects[P.effect.no] || P.effect.no}`, `Dim ${pct(P.effect.dimming)}  Speed ${pct(P.effect.speed)}`, `Master ${pct(P.master_intensity)}`]
      : [`Master ${pct(P.master_intensity)}  Cross ${pct(P.cross_fade)}`,
        `White  ${kelvin}K  ${pct(P.cct_intensity)}  G/M ${Math.round(P.green_magenta * 100)}`,
        P.color.type === COLOR_WAVE ? `Color  ${Math.round(P.color.length * (MAX_WAVELENGTH - MIN_WAVELENGTH) + MIN_WAVELENGTH)} nm  ${pct(P.color.dimming)}`
          : `Color  ${Math.round(P.color.hs.hue)}°  Sat ${pct(P.color.hs.sat)}  ${pct(P.color.dimming)}`];
    if (P.boost) lines.push('BOOST');
    this.readout.textContent = lines.join('\n');
  }
}
