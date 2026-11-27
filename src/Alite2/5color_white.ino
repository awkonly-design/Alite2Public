#include "common.h"

// White (CCT) mixing. The calibration tables live in the precompiled
// Alite2Calib library; select the LED bin with KELVIN_TABLE_SELECT (config.h).

// LED lot written by the factory programmer (NVS "auth"/"this": "1.0" = 3rd lot, "1.1" = 4th lot, none = 1st/2nd)
static int factory_white_table(void)
{
    Preferences hw;
    if (!hw.begin("auth", true)) return 0;     // read-only; missing on 1st/2nd lot lights
    String v = hw.getString("this", "0.0");
    hw.end();
    if (v == "1.0") return 1;
    if (v == "1.1") return 2;
    return 0;
}

void set_kelvin_table(void)
{
    int table = KELVIN_TABLE_SELECT >= 0 ? KELVIN_TABLE_SELECT : factory_white_table();
    alite2_calib_select_white_table(table);
    dbg.printf("Calib %s, white table %d\n", alite2_calib_version(), table);
}

/**
 * @brief Channel intensities (Lime, Cyan, Red, Amber, Blue) for a colour temperature.
 * @param masterIntensity   0.0 ~ 1.0 brightness
 * @param kelvin            1700 ~ 20000 K
 * @param result            COLOR_DEPTH results
 */
void calculateIntensities(float masterIntensity, int kelvin, float result[COLOR_DEPTH])
{
    alite2_calib_white(masterIntensity, kelvin, result);
}
