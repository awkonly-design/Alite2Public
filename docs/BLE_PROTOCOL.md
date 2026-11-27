# Alite2 BLE: adding your own packets

The light runs a BLE GATT server while it is in **Bluetooth** mode (Setup → Radio → Bluetooth, hold F2).
The BLE service is implemented in the precompiled `Alite2Link` library and is fixed: the official app depends on it,
and WiFi provisioning (needed for WiFi firmware updates) goes through it. You can **add** your own packets
(see "Your own packets" below).

## Identity

| Item | Value |
|---|---|
| Advertised name | `A SUN-<BLE MAC>` — e.g. `A SUN-A1B2C3D4E5F6` (`ALITE2_BLE_NAME` = `"A SUN"`) |
| Service UUID | `4bc61148-e02d-4b06-826e-637981ebb0a8` |
| Write characteristic | `a3dbd4b1-fccd-4e3d-80dc-ad8bd27f3b6a` — write / write without response |
| Notify characteristic | `c23f1999-4e3d-4de9-bade-7b3451bdda3e` — enable notifications (CCCD 0x2902) |
| Read characteristic | `7b303089-53fc-45a1-b918-9e64b07bfa60` — returns `"Default Read"` |

The same constants are in `src/libraries/Alite2Link/src/Alite2Link.h`.
On the very first BLE start the light learns its BLE MAC, stores it and restarts once.

## Packet format

Every write is one packet:

```
<HEAD>:<payload>
```

`HEAD` is ASCII up to the first `:`. The payload is ASCII text or binary bytes, depending on the packet.
Keep a packet within one write (default ATT MTU 23 → 20 bytes of payload per write unless the app negotiates a
larger MTU).

## Built-in packets

The official app's packets are built into `Alite2Link` and are not documented here. They cannot be changed or
replaced; packets with a head that starts with `U_` are always passed to your code (see "Your own packets").

## DMX charts

The DMX charts are the `DMX_*` modes in `src/Alite2/common.h` (0 `DMX_CCT_GM` … 16 `DMX_XY_PIXELS`); the same
charts are used for Art-Net / sACN / LumenRadio and for DMX data from the app. The decoding lives in the open firmware: `set_artnet_pwm_update()` in `led_pwm.ino`.

To add a chart:

1. add a mode after `DMX_MODE_PIXELS` in `common.h` (it gets number 19, 20, …);
2. add a `case` for it in `set_artnet_pwm_update()` (and raise `MAX_ARTNET_BUFF` if it needs more channels);
3. add its name at the end of the `DmxModeDropdown` options on ArtnetScreen (Alite2 Studio can edit them);
4. select it on the light (ArtnetScreen) or send its data from your own app with a `U_...` packet.

## Your own packets

Any head that is not built in is passed to `alite2_on_ble_user_packet()` in `src/Alite2/ble_user.ino`:

```cpp
bool alite2_on_ble_user_packet(const char *head, const uint8_t *payload, size_t len)
{
    if (strcmp(head, "U_PING") == 0) {                 // write "U_PING:"
        const char reply[] = "U_PONG:1.2.3";
        alite2_ble_notify((const uint8_t *)reply, sizeof(reply) - 1);   // arrives on the notify characteristic
        return true;
    }
    return false;
}
```

- Start your heads with `U_` so they never collide with future built-in packets.
- Reply with `alite2_ble_notify(data, len)`; it returns false when no app is connected.
- The examples in `ble_user.ino`: `U_PING` → `U_PONG:<version>`, `U_STATE` → `U_STATE:` + master intensity (0–255) + boost (0/1).

### Quick test without writing an app

With a generic BLE tool (e.g. nRF Connect): connect to `A SUN-…`, enable notifications on `c23f1999…`,
write the text `U_PING:` to `a3dbd4b1…` and you receive `U_PONG:<firmware version>`.
