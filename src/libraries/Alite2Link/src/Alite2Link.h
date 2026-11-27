/*******************************************************************************
 * Alite2Link — BLE / WiFi / OTA link layer of the Alite2 firmware (precompiled, closed source)
 *
 * This library owns everything a firmware update depends on: the BLE GATT service used
 * by the companion app (including WiFi provisioning), the WiFi station connection, and
 * ArduinoOTA. It ships as a binary so these paths cannot be broken by accident.
 *
 * Open for you:
 *   - the DMX chart (how DMX / BLE data becomes LED output): led_pwm.ino, via alite2_on_ble_dmx()
 *   - your own BLE packets: implement alite2_on_ble_user_packet() (see ble_user.ino) and
 *     answer with alite2_ble_notify()
 *
 * BLE (fixed — see docs/BLE_PROTOCOL.md):
 *   device name   "A SUN-<MAC>"      service  ALITE2_BLE_SERVICE_UUID
 *   write         ALITE2_BLE_WRITE_UUID  (write / write without response)
 *   notify        ALITE2_BLE_NOTIFY_UUID (notifications from the light)
 *   read          ALITE2_BLE_READ_UUID
 *   packet        "<HEAD>:<payload>"  (ASCII head, ':' then text or binary payload)
 *   built-in packets of the official app cannot be changed; use heads starting with "U_"
 *
 * Update protection (runs before setup(), cannot be disabled by the firmware):
 *   - an OTA image is accepted only if it contains Alite2Link (so recovery is always present)
 *   - a new image is kept as soon as it starts (power-off / restart afterwards does not return to the previous one)
 *   - 3 quick crashes / restarts in a row: boot the previous firmware, then recovery mode
 *   Recovery mode skips setup()/loop(): WiFi (saved access points) + BLE provisioning + ArduinoOTA,
 *   the LCD backlight blinks. It ends with a successful update, or hold F1 for 2 s to switch the light off.
 ******************************************************************************/
#ifndef ALITE2_LINK_H
#define ALITE2_LINK_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#if defined(__cplusplus) && defined(ARDUINO)
// Arduino libraries used by the precompiled code; including them here makes the IDE / arduino-cli build them.
#include <WiFi.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <Preferences.h>
#include <BLEDevice.h>
#include <HTTPClient.h>             // alite2_official_update()
#include <NetworkClientSecure.h>
#endif

// ---------------------------------------------------------------- identity (fixed, public)
#define ALITE2_BLE_NAME             "A SUN"
#define ALITE2_BLE_SERVICE_UUID     "4bc61148-e02d-4b06-826e-637981ebb0a8"
#define ALITE2_BLE_READ_UUID        "7b303089-53fc-45a1-b918-9e64b07bfa60"
#define ALITE2_BLE_WRITE_UUID       "a3dbd4b1-fccd-4e3d-80dc-ad8bd27f3b6a"
#define ALITE2_BLE_NOTIFY_UUID      "c23f1999-4e3d-4de9-bade-7b3451bdda3e"

// ---------------------------------------------------------------- wireless modes (fixed)
// Stored in NVS (namespace "WIFI", key ALITE2_NVS_WIRELESS_KEY); also the order of the Setup > Radio list.
enum
{
    WIRELESS_OFF = 0,
    WIRELESS_BLE,
    WIRELESS_ARTNET,
    WIRELESS_LUMEN,
    WIRELESS_BROADCASTER,
    WIRELESS_AUDIENCE,
    WIRELESS_sACN,
};
#define ALITE2_NVS_NAMESPACE        "WIFI"
#define ALITE2_NVS_WIRELESS_KEY     "wirelessKey"

// kinds passed to alite2_on_ble_dmx()
enum
{
    ALITE2_BLE_DMX_SINGLE = 0,   // legacy single-zone frame, 8 bit
    ALITE2_BLE_DMX_PIXELS,       // legacy per-pixel frame, 8 bit
    ALITE2_BLE_DMX_CHART,        // frame in DMX chart <chart>, 8 or 16 bit
};

// state reported to the official app (filled by the firmware)
typedef struct
{
    uint8_t wireless;   // WIRELESS_*
    uint8_t lastPage;   // last screen index
    uint8_t lang;       // UI language
} alite2_link_state_t;

#ifdef __cplusplus
extern "C" {
#endif

const char *alite2_link_version(void);

// ---------------------------------------------------------------- BLE
void alite2_ble_begin(void);                       // start the GATT server (restarts once to learn the BLE MAC)
void alite2_ble_loop(void);
bool alite2_ble_connected(void);
bool alite2_ble_notify(const uint8_t *data, size_t len);   // send a notification to the connected app
const char *alite2_ble_device_name(void);          // "A SUN-<MAC>"
void alite2_ble_mac(uint8_t mac[6]);               // stored BLE MAC (zeros before the first BLE start)

// ---------------------------------------------------------------- WiFi station
// Up to 3 access points are provisioned over BLE. fallback_* is tried in slot 2 when it is empty.
void alite2_wifi_begin(const char *fallback_ssid, const char *fallback_pass);
void alite2_wifi_loop(void);
void alite2_wifi_end(void);
bool alite2_wifi_connected(void);
long alite2_wifi_rssi(void);
void alite2_wifi_mac(char out[13]);                // lower-case hex, e.g. "a1b2c3d4e5f6"
uint32_t alite2_link_timezone(void);               // seconds, set by the app
void alite2_link_factory_reset(void);              // clear WiFi credentials, wireless mode -> BLE

// ---------------------------------------------------------------- OTA (ArduinoOTA)
// Host name "<hostname_prefix>-<last 3 MAC bytes, upper-case hex>" (e.g. "Alite2-A1B2C3"), mDNS TXT "alite2=<fw_version>".
// The password is generated by the library from the WiFi MAC and the current IP address (8 characters,
// A-Z / 2-9 without I, O); `password` is ignored (kept for compatibility, pass NULL). Show alite2_ota_password()
// to the user, e.g. in alite2_on_wifi_status(). Recovery mode accepts the last password that was generated.
#define ALITE2_OTA_PASSWORD_LEN 8
void alite2_ota_begin(const char *hostname_prefix, const char *password, uint16_t port, const char *fw_version);
const char *alite2_ota_password(void);             // current OTA password, "" while WiFi is not connected
void alite2_ota_loop(void);
const char *alite2_ota_hostname(void);
bool alite2_ota_pending_verify(void);              // image not confirmed yet (always false in setup()/loop(): confirmed at start)
bool alite2_link_recovery_mode(void);              // never true inside setup()/loop() (recovery does not run them)
bool alite2_ota_revert(void);                      // boot the other OTA slot if it holds a valid app (restarts); false if none

// Official firmware from the manufacturer's update server (WiFi mode, connected). Checks that the light is registered,
// then restarts at once: the update runs before setup() (LEDs off, backlight blinking, stored WiFi access points) and
// installs the official firmware when its version is the same as or newer than current_version (anything after the
// version numbers, e.g. " (3)", is ignored). The light then restarts into the official firmware, or back into this
// firmware with the result for alite2_official_result().
// The server address and the light's factory token are read from NVS namespace "auth", written by the company firmware
// (lights that ran official firmware 1.2.6 or later, or the factory firmware); keep that namespace when erasing NVS.
// Returns only when it cannot start: ALITE2_OFFICIAL_NO_WIFI or ALITE2_OFFICIAL_NOT_REGISTERED. progress is unused.
#define ALITE2_OFFICIAL_NO_WIFI         (-1)    // WiFi not connected
#define ALITE2_OFFICIAL_SERVER          (-2)    // update server not reachable, bad answer or refused (daily limit)
#define ALITE2_OFFICIAL_OLDER           (-3)    // the official firmware is older than the running one
#define ALITE2_OFFICIAL_FAILED          (-4)    // download, check or flash write failed (the running firmware stays)
#define ALITE2_OFFICIAL_NOT_REGISTERED  (-5)    // no server address / factory token in NVS (light never ran official 1.2.6+)
typedef void (*alite2_official_progress_t)(size_t done, size_t total);
int alite2_official_update(const char *current_version, alite2_official_progress_t progress, char *version_out, size_t version_len);
// Result of the last official update after the restart, once (then cleared): 0 none, ALITE2_OFFICIAL_* on failure.
// version_out (optional) receives the official version the server offered.
int alite2_official_result(char *version_out, size_t version_len);

// ---------------------------------------------------------------- hooks implemented by the firmware (link_hooks.ino)
void alite2_on_message(const char *text);                       // short message on the screen
void alite2_on_wifi_status(const char *text);                   // IP address or "Disconnected" (alite2_ota_password() is up to date)
void alite2_on_ota_start(void);                                 // an update begins: turn the LEDs off
void alite2_on_ble_pwm(const uint16_t pwm[5]);                  // raw PWM per LED colour from the app
void alite2_on_ble_dmx(uint8_t kind, uint8_t chart, bool bits16, const uint8_t *data, size_t len);
void alite2_on_ble_get_state(alite2_link_state_t *state);      // values reported to the official app

// optional: your own BLE packets. Called for every head that is not built in.
// Return true when handled. Default implementation (weak) ignores the packet.
bool alite2_on_ble_user_packet(const char *head, const uint8_t *payload, size_t len);

#ifdef __cplusplus
}
#endif

#endif
