/*******************************************************************************
 * link_hooks.ino — glue between the Alite2Link library and this firmware (open)
 *
 * Alite2Link (src/libraries/Alite2Link, precompiled) runs BLE, WiFi and the OTA
 * update. It calls the functions below; change what they do on screen or with
 * the LEDs freely, but keep them all defined.
 *
 * The DMX chart — how DMX / Art-Net / BLE data becomes LED output — is open:
 * see wireless_callback() and set_ble_pwm_callback() in led_pwm.ino and the
 * DMX_* modes in common.h.
 ******************************************************************************/
#include "common.h"

// short message on the screen (translated through multi_language.c)
void alite2_on_message(const char *text)
{
    second_message(text);
}

// WiFi state for the Setup > Radio screen: the IP address or "Disconnected",
// and under it the OTA password of this IP (empty while disconnected)
void alite2_on_wifi_status(const char *text)
{
    custom_label_set_text(ui_IpLabel, text);
    const char *pw = alite2_ota_password();
    char buf[24];
    if (pw[0]) snprintf(buf, sizeof(buf), "PASS: %s", pw); else buf[0] = 0;
    custom_label_set_text(ui_OtpLabel, buf);
}

// a WiFi update starts: stop the effects and turn every LED off
void alite2_on_ota_start(void)
{
    set_blackout(true);
    all_led_off();
}

// raw PWM per LED colour from the official app (Lime, Cyan, Red, Amber, Blue)
void alite2_on_ble_pwm(const uint16_t pwm[5])
{
    for (int i = 0; i < COLOR_DEPTH; i++) localLED.pwm[i] = pwm[i];
}

// DMX frames from the app. kind: ALITE2_BLE_DMX_SINGLE / _PIXELS (legacy 8 bit frames)
// or ALITE2_BLE_DMX_CHART (frame in DMX chart <chart>, 8 or 16 bit). Add new charts in led_pwm.ino.
void alite2_on_ble_dmx(uint8_t kind, uint8_t chart, bool bits16, const uint8_t *data, size_t len)
{
    switch (kind)
    {
        case ALITE2_BLE_DMX_SINGLE:
            param.dmx_mode = DMX_MODE_SINGLE;
            param.dmx_bits = DMX_8BITS;
            if (len >= BLE_SINGLE_LEN) set_ble_pwm_callback((uint8_t *)data, BLE_SINGLE_LEN);
            break;
        case ALITE2_BLE_DMX_PIXELS:
            param.dmx_mode = DMX_MODE_PIXELS;
            param.dmx_bits = DMX_8BITS;
            if (len >= BLE_PIXELS_LEN) set_ble_pwm_callback((uint8_t *)data, BLE_PIXELS_LEN);
            break;
        case ALITE2_BLE_DMX_CHART:
            param.dmx_mode = chart;
            param.dmx_bits = bits16 ? DMX_16BITS : DMX_8BITS;
            set_ble_pwm_callback((uint8_t *)data, len);
            break;
    }
}

// state values the official app reads over BLE
void alite2_on_ble_get_state(alite2_link_state_t *state)
{
    state->wireless = wifiParam.wireless;
    state->lastPage = wifiParam.lastPage;
    state->lang = wifiParam.lang;
}
