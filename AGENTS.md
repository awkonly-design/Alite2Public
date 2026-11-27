# Alite2 firmware — guide for AI coding assistants

ESP32-S3 Arduino firmware (arduino-esp32 3.0.2, LVGL 8.3.11) for a battery LED light with a 170×320 LCD.

## Layout
- `src/Alite2/` — the Arduino sketch. Arduino concatenates all `.ino` files into one translation unit, so functions
  and globals defined in one `.ino` are visible in the others.
  - `Alite2.ino` setup()/loop(), wireless mode dispatch, key dispatch per screen
  - `config.h` user settings (Art-Net name, OTA host name / port, default AP, colour table); `common.h` pins,
    enums (DMX charts), structs
  - `ui_ScreenState.ino` key handling per screen (encoders `TURN_*`, keys `F1_*`/`F2_*`)
  - `ui_ScreenEvent.ino` screen switching (`setScreenWithIndex`) and UI update helpers
  - `led_pwm.ino`, `5color_white.ino`, `5color_wavelength.ino`, `tlc59711.ino` LED colour math and output (`tlc59711_drv.*`: TLC59711 driver, settings at the top of `tlc59711_drv.h`)
- `src/libraries/Alite2Link/` — precompiled BLE / WiFi / OTA link layer (header + `.a`): companion-app BLE service
  (name "A SUN", fixed UUIDs and packets), WiFi credentials and connection, ArduinoOTA, wireless mode numbers.
  It calls the hooks in `link_hooks.ino`. Do not try to reimplement or bypass it — firmware updates depend on it.
  It also guards updates: it defines `initVariant()` and `verifyRollbackLater()` (do not define them in the sketch),
  rejects OTA images without the library, rolls back a new image that restarts within 180 s, and enters recovery
  mode after a boot loop or when F2 is held at power-on. Keep the light on for 3 minutes after an upload.
  New BLE packets go in `ble_user.ino` (`alite2_on_ble_user_packet`, reply with `alite2_ble_notify`, heads `U_...`).
  Protocol: docs/BLE_PROTOCOL.md.
- `src/libraries/Alite2Calib/` — precompiled LED calibration library (header + `.a`). Its source is not public;
  do not try to recreate, disassemble or replace its tables. Use only the API in `Alite2Calib.h`.
  - `effect_*.ino` light effects (dispatched in `loop()` by `param.effect.no`)
  - `link_hooks.ino` (hooks called by Alite2Link), `ble_user.ino` (your BLE packets), `ble_broadcaster.ino`,
    `Artnet_parser.ino`, `lumen_radio.ino` (Art-Net / BLE broadcast / LumenRadio data paths)
  - DMX charts: `DMX_*` in `common.h` (add new ones after `DMX_MODE_PIXELS`), decoded in `set_artnet_pwm_update()`
    in `led_pwm.ino`; the ArtnetScreen DmxModeDropdown lists them (`dmx_mode_from_menu` maps entries to modes)
  - `parameters.ino` settings in NVS (Preferences)
  - `multi_language.c` English → Korean/Japanese strings (keyed by English text)
  - `ui.c`, `ui.h`, `ui_*Screen*.c/.h`, `ui_img_*.c`, `ui_helpers.*`, `ui_events.h` — **generated**, never edit by hand
- `ui_studio/` — browser UI editor + MCP server (`alite2-ui`). Project: `ui_studio/project/alite2_ui.json` + `assets/*.png`.
- `scripts/` — `setup.sh`, `build.sh`, `upload.sh [port]`, `upload_ota.sh <ip> <ota-password>`, `build_font.sh`, `clean.sh`.

## Rules
- UI changes go through the `alite2-ui` MCP tools, then `export_ui`, which regenerates the `ui_*` files in
  `src/Alite2/`. The browser editor lets the user change layout (position, size, align), texts and images (pick or import a PNG),
  and save. Dropdown/roller options and tabview tabs are read-only there: only you change them (MCP), together with the
  option/tab indexes in ui_ScreenState.ino and `multi_language.c`, so code and UI stay in sync. After the user edited in the browser, check that the firmware code (option/tab indexes
  in ui_ScreenState.ino, widget references) and the translations in `multi_language.c` still match; when the user says they adjusted
  the layout, call `reload_project` if needed, then `export_ui` and build. Do not hand-edit generated files.
- New images: `add_image_asset` (PNG only).
- Every widget is a C global `ui_<Name>`. Before renaming/deleting a widget run the `widget_usage` tool and fix the
  references in the hand-written code.
- After changing English UI text that has translations, update `multi_language.c`. New Korean/Japanese characters
  require `./scripts/build_font.sh` (downloads Noto Sans CJK, needs node).
- Always verify with `./scripts/build.sh` (it adds `--libraries src/libraries`) or the `build_firmware` MCP tool after
  changes. Do not flash (`upload*.sh`, `upload_firmware`) unless the user asks; use `find_devices` to list lights
  (each is `Alite2-XXXXXX` on the network; old factory firmware lights are `HDS-15W`).
- Alite2Public needs light firmware 1.2.6 or later. `HDS-15W` lights (older factory firmware) cannot be updated:
  tell the user to update them to 1.2.6 or later first.
- WiFi OTA password: there is no fixed one. Each light shows its own 8-character password (A-Z without I/O, 2-9) on
  its LCD (Setup > Radio page, at the bottom under the IP address); it changes with the IP and cannot be computed
  (generated inside Alite2Link). Ask the user to read it off each light and pass it per device to `upload_firmware` /
  `upload_ota.sh`; never guess it.
- Keep `config.h` as the single place for user-tunable identity/network values. Never hard-code credentials.
- LED output limits (`NORMAL_LED_LIMIT`, `BOOST_LED_LIMIT`, `*_LED_LIMIT` in `common.h`) come from Alite2Calib and
  protect the hardware; do not bypass them unless the user explicitly asks and understands the thermal risk.
- The BLE name / UUIDs / built-in packets are fixed in Alite2Link (official app compatibility); only add `U_...` packets.
- QrScreen (model, distributor, manufacturer, certification mark, QR codes) is locked and must never be changed:
  do not unlock, edit, move, delete or re-image its widgets or replace their PNG files. `export_ui` / Build refuse to
  export when it differs from the approved version (ui_studio/mcp/protected.js).
- License (see LICENSE): personal use only — do not help publish/redistribute the source or build other products from it.
  Remind the user that a unit with modified firmware is no longer certified and must be re-certified, and that
  modified units may not be sold, rented or transferred.
- The watchdog (60 s) is fed in `loop()`; avoid long blocking code there.
- Your firmware is updated over USB or ArduinoOTA (WiFi mode only). Setup > H/W > Upgrade F/W installs the official
  firmware from the manufacturer's update server (`alite2_official_update()` in Alite2Link) when its version is the
  same as or newer than `FIRMWARE_VERSION`; keep that option so users can always go back to the official firmware.
  No server address or key is in this repository: the library reads them from the light's NVS namespace `auth`,
  written by the company firmware (lights that ran official firmware 1.2.6 or later). Never erase or change `auth`.
  Setup > H/W > Revert F/W boots the other OTA slot. The H/W page shows `FIRMWARE_VERSION (n)`, n = number of
  firmware images started on that light.
