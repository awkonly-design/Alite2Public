# Alite2 Studio

A simple viewer for the LCD screens of the Alite2 firmware (170×320, LVGL 8.3). You pick a screen in the list and see it as it will look
on the device and can fix its layout by hand (position, size, align) and edit texts and images; dropdown / roller options and tabs are shown read-only. Everything else is done by your AI assistant through MCP.

| In the browser (by hand) | Through the AI assistant (MCP) |
|---|---|
| View one screen at a time (pick it in SCREENS), select widgets (canvas or STRUCTURE) | Add / delete / duplicate widgets and screens |
| Move widgets: drag, arrow keys (1px / Shift 10px), X / Y | Flags, images |
| Resize widgets: handles, Ctrl/⌘+arrows, W / H (px, %, content) | |
| Set the align anchor (keeps the widget in place, or snaps it with the 3×3 grid) | |
| Edit texts (labels) and titles (checkboxes) | Translations in `multi_language.c`, firmware logic |
| View dropdown / roller options (read-only) | Change dropdown / roller options, colours, fonts, styles |
| View tabview tabs, click to show a tab (read-only) | Add, rename, delete tabs (and update `ui_ScreenState.ino` / `multi_language.c`) |
| Image widgets: pick another PNG of the project or import a new PNG | |
| Align and distribute selected widgets | Rename, reorder, reparent |
| Undo / redo, **save** (Ctrl/⌘+S) | **Export the C code into the firmware** (`export_ui`) |

## Build & upload over WiFi

**▶ Build** (toolbar, top right):

1. saves the project and exports the UI code into `../src/Alite2/`,
2. compiles the firmware (`../scripts/build.sh`) with a progress bar,
3. scans the network (mDNS) for lights that accept WiFi updates — Alite2 lights show their firmware version and are
   pre-selected; you can also add a light by IP,
4. **Upload to N lights** sends `build/Alite2.ino.bin` to every ticked light in parallel (ArduinoOTA), each with its
   own progress bar and result. Each light needs its own **8-character OTA password**: the light shows it on its
   LCD in Setup → Radio, at the bottom of the page under the IP address. After you press Upload a password window
   asks for it, one field per light (upper-case letters and digits, no 0/O/1/I). It changes when the light's IP address changes, so it is kept only while the page is open,
   never saved.

**⇪ Upload** (next to Build) skips steps 1–2: it uploads the last build (`build/Alite2.ino.bin`) again, e.g. to test
the same firmware on another light or after a failed upload. Press Build after changing the UI or the code.

A light shows up only in WiFi mode (Setup → Radio → Artnet, hold F2) after it joined the same network as this
computer, or in recovery mode (shown as **Recovery mode**). After an update keep the light on for 3 minutes, or it
returns to the previous firmware. In recovery mode the light uses the last password it showed on screen. Alite2Public needs light firmware **1.2.6 or later**. Lights
still running older factory firmware (`HDS-15W`) are listed as **Old factory F/W** but cannot be selected: update them
to 1.2.6 or later first. Lights with factory firmware 1.2.6 or later (`Alite2-XXXXXX` without a version) are listed as
**New factory firmware** and need the password shown on the light, like this firmware. Images without the Alite2Link library are rejected by the light. Requirements: `../scripts/setup.sh` done (arduino-cli, esp32 core with `espota.py`) and Python 3.
The AI assistant can do the same with the MCP tools `build_firmware`, `find_devices` and `upload_firmware`
(it asks you for each light's password; `upload_firmware` takes `{device, password}` per light); the progress shows up
in the editor.


### Going back to a previous firmware

- **Within 3 minutes:** a new firmware must run for 3 minutes before it is kept. Switch the light off and on before
  that and it starts the previous firmware again.
- **Crash protection:** 3 restarts in a row within 30 seconds start the previous firmware automatically.
- **Setup → H/W → Revert F/W:** starts the firmware in the other update slot.
- **Setup → H/W → Upgrade F/W:** downloads and installs the official firmware (WiFi mode, connected; the light restarts
  and downloads with the LEDs off and the backlight blinking). Needs a light that ran official firmware 1.2.6 or later.
- **Recovery mode — hold F2 while switching on (3 s):** the firmware does not start, the LEDs stay off and the backlight
  blinks. The light joins its saved WiFi (or gets one from the app over BLE) and accepts an upload from Alite2 Studio
  with the last password it showed. Hold F1 for 2 s to switch it off.

## Run

```bash
./run.sh            # installs dependencies on first run, starts the server, opens http://127.0.0.1:5190
./run.sh claude     # starts Claude Code in the repository with the Alite2 Studio tools connected, opens the editor
./run.sh codex      # the same with the Codex CLI (the MCP server is passed with -c, no config file needed)
./run.sh stop
```

With `claude` / `codex` the assistant's MCP server serves the editor (or joins a server that is already running), and
the page opens as soon as it answers. Claude Code may ask once to trust the project's MCP server `alite2-ui`.

Node.js 18+ is required. Set `ALITE2_UI_PORT` to use another port.

The project is `project/alite2_ui.json` with its images in `project/assets/`. Saving backs up the previous file once
per session to `project/backup/`.

After a manual change, save, then ask the assistant to export and build, e.g.
*"Export the UI to the firmware and build it"*. The export writes `ui.c/.h`, `ui_<Screen>.c/.h`, `ui_img_*.c`, `ui_helpers.c/.h`
and `ui_events.h` into `../src/Alite2/` (only files marked "generated by Alite2 Studio" are replaced or removed).

## AI assistants (MCP)

`mcp/server.js` is an MCP server (stdio). It serves the editor and drives the open editor tab over a WebSocket, so the
assistant edits the UI while you watch; each change is one undo step.

- **Claude Code**: `.mcp.json` in the repository root registers `alite2-ui` automatically.
- **Codex CLI**: in `~/.codex/config.toml`
  ```toml
  [mcp_servers.alite2-ui]
  command = "node"
  args = ["/absolute/path/to/Alite2Public/ui_studio/mcp/server.js"]
  ```
- **Other MCP clients**: command `node`, args `[".../ui_studio/mcp/server.js"]`.

When the assistant starts the server, the editor opens in your browser automatically if no editor tab is open yet
(set `ALITE2_UI_NO_BROWSER=1` in the MCP server environment to disable). The **AI (MCP)** badge turns green.

| Tool | What it does |
|---|---|
| `get_state` | Connection, screens, selection, unsaved flag, history |
| `reload_project` | Reload the project from disk |
| `get_tree` / `get_widget` | Widget tree of a screen / all properties of one widget |
| `widget_usage` | Where firmware code references `ui_<name>` |
| `add_widget` / `update_widget` / `delete_widgets` / `duplicate_widgets` / `reparent_widget` | Edit widgets |
| `arrange` | Align, distribute, same size, z-order |
| `add_image_asset` | Copy a local PNG into `project/assets/` |
| `add_screen`, `select`, `undo`, `redo`, `list_assets` | |
| `save` | Save the project |
| `export_ui` | Save and write the C code into `src/Alite2/` |
| `build_firmware` | Save, export and compile (progress in the editor) |
| `find_devices` | Lights on the WiFi network (mDNS) |
| `upload_firmware` | Flash the built firmware to chosen lights over WiFi |

Security: the server listens on 127.0.0.1 only, accepts editor connections only from its own origin, checks the Host
header, and the browser can only save this one project. Adding images and exporting into the sketch folder are
MCP-only. A second
server process (e.g. two AI sessions) relays through the first using a token in `~/.alite2-ui-studio/` (mode 0600).

## Shortcuts

| Action | How |
|---|---|
| Select / multi-select | Click, Shift/Ctrl+click, marquee drag on an empty screen area, Alt+click selects the parent |
| Move | Drag (Shift: lock axis, Alt: no snapping), arrows 1px, Shift+arrows 10px |
| Resize | Handles (Shift: keep ratio), Ctrl/⌘+arrows 1px, Ctrl/⌘+Shift+arrows 10px |
| Align | Alt+A/H/D (left/center/right), Alt+W/V/S (top/middle/bottom); one widget aligns inside its parent |
| Undo / save | Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl/⌘+S |
| View | Wheel/pinch zoom, Space+drag pan, 0 fit screen, 1 = 100% |
