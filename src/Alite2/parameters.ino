#include <common.h>
#include <Preferences.h>
#include "esp_app_desc.h"
#include <ESP32Time.h>

extern "C" {
    #include "nvs_flash.h"
    #include "nvs.h"
    #include "multi_language.h"
}

Preferences prefs;
parametersType param;

Preferences wififs;
wifi_type wifiParam;

void nvs_info(void) 
{
    nvs_stats_t stats;

    esp_err_t err = nvs_get_stats(NULL, &stats);
    if (err == ESP_OK) 
    {
        dbg.printf("NVS Usage:\n");
        dbg.printf("  Used entries     : %d\n", stats.used_entries);
        dbg.printf("  Free entries     : %d\n", stats.free_entries);
        dbg.printf("  Total entries    : %d\n", stats.total_entries);
        //dbg.printf("  Used pages       : %d\n", stats.used_pages);
        //dbg.printf("  Free pages       : %d\n", stats.free_pages);
        //dbg.printf("  Total pages      : %d\n", stats.total_pages);
    } else {
        dbg.printf("nvs_get_stats failed: %s\n", esp_err_to_name(err));
    }
}

char slotName[2];

void get_slot_name(void)
{
    Preferences slotfs;

    slotfs.begin("SLOT");
    slotName[0] = slotfs.getUChar(SLOT_NAME_KEY, 'A');
    slotName[1] = '\0';
    slotfs.end();
}

void put_slot_name(uint8_t i)
{
    Preferences slotfs;

    slotName[0] = 'A' + i;
    dbg.printf("%c %d\n", slotName[0], i);

    slotfs.begin("SLOT");
    slotfs.putUChar(SLOT_NAME_KEY, slotName[0]);
    slotfs.end();
}

bool has_non_alnum(const char *str) 
{
    while(*str) 
    {
        if (!isalpha((unsigned char)*str) && !isdigit((unsigned char)*str)) 
        {
            return true;  // contains a character that is neither a letter nor a digit
        }
        str++;
    }
    return false;  // letters and digits only
}

void load_slot_parameters(void)
{
    prefs.begin(slotName); //namespace
    param.version = PARAM_VERSION;
    param.master_intensity = prefs.getFloat(MASTER_INTENSITY_KEY, 1.0);
    param.cross_fade = prefs.getFloat(CROSS_FADE_KEY, 0.0);
    param.cct_intensity = prefs.getFloat(CCT_INTENSITY_KEY, 1.0);
    param.cct_pos = prefs.getFloat(CCT_POS_KEY, 0.5);
    param.green_magenta = prefs.getFloat(GREEN_MAGENTA_KEY, 0.0);

    param.dmx_ch = prefs.getUShort(DMX_CH_KEY, 1);
    param.universe = prefs.getUShort(UNIVERSE_KEY, 0);
    param.dmx_mode = prefs.getUChar(DMX_MODE_KEY, DMX_MODE_SINGLE);
    param.dmx_bits = prefs.getUChar(DMX_BITS_KEY, DMX_8BITS);

    param.color.dimming = prefs.getFloat(WAVEDIMM_KEY, 1.0);
    param.color.length = prefs.getFloat(WAVELENGTH_KEY, 0.5);
    param.color.type = prefs.getUChar(COLOR_TYPE_KEY, COLOR_HSI);
    param.color.hs.hue = prefs.getFloat(HUE_KEY, 0.0);
    param.color.hs.sat = prefs.getFloat(SAT_KEY, 1.0);
    /*
    memset(param.effect.name, 0x00, EFFECT_NAME_LEN);
    if (prefs.getBytes(EFFECT_NAME_KEY, param.effect.name, EFFECT_NAME_LEN) == 0)
        strcpy(param.effect.name, "Off");//set default
    */
    //dbg.printf("load effect: %s\n", param.effect.name);
    param.effect.dimming = prefs.getFloat(EFFECT_DIM_KEY, 1.0);
    param.effect.speed = prefs.getFloat(EFFECT_SPEED_KEY, 0.5);
    param.effect.no = prefs.getUChar(EFFECT_NO_KEY, 0);
    param.effect.trig = prefs.getUChar(EFFECT_TRIG_KEY, TRIG_OFF);

    param.boost = prefs.getBool(BOOST_KEY, false);
}
/*
void slot_parameters_commit(void)
{
    prefs.end();
    prefs.begin(slotName); //namespace
}
*/
void reload_slot_parameters(void)
{
    prefs.end();
    load_slot_parameters();
}

void load_wifi_parameters(void)
{
    wififs.begin(ALITE2_NVS_NAMESPACE);
    wifiParam.wireless = wififs.getUChar(WIRELESS_KEY, WIRELESS_ARTNET);//default after first boot
    wifiParam.lastPage = wififs.getUChar(LAST_PAGE_KEY, MENU_SCREEN);
    wifiParam.lang = wififs.getUChar(LANG_KEY, LANG_ENG);
}


void parametersInit() 
{
    nvs_info();

    get_slot_name();
    load_slot_parameters();
    //calcPwm_by_param();
    //calcRgb_by_param();

    //---------------------------------------------------------------------------
}

void factory_reset_wifi_parameters(void)
{
    alite2_link_factory_reset();      // clears WiFi credentials, wireless mode -> BLE
    wifiParam.wireless = WIRELESS_BLE;
}


// ---------------------------------------------------------------- build number shown in Setup > H/W
// "1.2.5 (3)": the number goes up by one every time a different firmware image starts on this light (each USB or
// WiFi upload of Alite2Public). It is kept in NVS ("a2build") and survives factory resets of the settings.
uint32_t firmware_build_number(void)
{
    static uint32_t number = 0;
    if (number) return number;
    char sha[17];
    esp_app_get_elf_sha256(sha, sizeof(sha));
    Preferences p;
    p.begin("a2build", false);
    number = p.getULong("count", 0);
    if (p.getString("sha", "") != sha)
    {
        number++;
        p.putULong("count", number);
        p.putString("sha", sha);
    }
    p.end();
    return number;
}

// Setup > H/W > Upgrade F/W: the official firmware from the manufacturer's update server (Alite2Link). Keep this
// option so a user can always go back to the official firmware. The library needs the factory registration the
// company firmware keeps in NVS (lights that ran official firmware 1.2.6 or later). It restarts at once and downloads
// before setup() (LEDs off, backlight blinking: the LCD says so first); the light then starts the official firmware, or this one again with
// the reason shown by official_update_result().
void official_update(void)
{
    // the screen blinks during the download, so say so before restarting (otherwise it looks broken)
    if (alite2_wifi_connected())
    {
        custom_label_set_text(ui_FirmwareLabel, "LCD blinks while\nupdating");
        for (uint32_t t0 = millis(); millis() - t0 < 3000; ) { lv_timer_handler(); delay(20); }
    }
    int r = alite2_official_update(FIRMWARE_VERSION, NULL, NULL, 0);   // returns only when it cannot start
    if (r == ALITE2_OFFICIAL_NO_WIFI) custom_label_set_text(ui_FirmwareLabel, "WiFi has to\nbe connected");
    else custom_label_set_text(ui_FirmwareLabel, "Not registered:\nneeds official 1.2.6+");
}

// called at the end of setup(): why the last Upgrade F/W did not install the official firmware
void official_update_result(void)
{
    char official[24], buf[48];
    int r = alite2_official_result(official, sizeof(official));
    if (r >= 0) return;
    switch (r)
    {
        case ALITE2_OFFICIAL_NO_WIFI:        snprintf(buf, sizeof(buf), "Upgrade: no WiFi"); break;
        case ALITE2_OFFICIAL_NOT_REGISTERED: snprintf(buf, sizeof(buf), "Not registered:\nneeds official 1.2.6+"); break;
        case ALITE2_OFFICIAL_OLDER:          snprintf(buf, sizeof(buf), "Official %s is\nolder than this", official); break;
        case ALITE2_OFFICIAL_FAILED:         snprintf(buf, sizeof(buf), "Upgrade failed"); break;
        default:                             snprintf(buf, sizeof(buf), "Update server\nnot reachable"); break;
    }
    custom_label_set_text(ui_FirmwareLabel, buf);
    second_message(buf);
}
