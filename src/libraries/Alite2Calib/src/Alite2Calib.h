/*******************************************************************************
 * Alite2Calib — LED calibration library (precompiled, closed source)
 *
 * Holds the factory colour calibration of the Alite2 LED engine: white (CCT)
 * mixing tables, LED flux / wavelength data and per-channel output limits.
 * It ships as a binary (src/esp32s3/libAlite2Calib.a); only this API is public.
 *
 * Channel order of all arrays: Lime, Cyan, Red, Amber, Blue (ALITE2_CALIB_CHANNELS).
 ******************************************************************************/
#ifndef ALITE2_CALIB_H
#define ALITE2_CALIB_H

#ifdef __cplusplus
extern "C" {
#endif

#define ALITE2_CALIB_CHANNELS   5

typedef struct
{
    float normal_limit;      // max output (0..1) in normal mode
    float boost_limit;       // max output (0..1) in boost mode
    float low_cutoff;        // minimum PWM ratio of a lit channel
    float blue_low_cutoff;   // minimum PWM ratio of the blue channel
    float gm_max_limit;      // green/magenta correction range
    float cyan_limit;        // per-channel limits used by the colour modes
    float lime_limit;
    float amber_limit;
    float indigo_limit;
    float deepred_limit;
} alite2_calib_limits_t;

/** Output limits (read only). */
extern const alite2_calib_limits_t alite2_calib_limits;

/** Library build identifier, e.g. "1.0". */
const char *alite2_calib_version(void);

/** Select the white mixing table (LED bin): 0, 1 or 2. Other values fall back to 0. */
void alite2_calib_select_white_table(int index);

/** Channel intensities for a correlated colour temperature.
 *  master: 0..1 brightness, kelvin: 1700..20000 */
void alite2_calib_white(float master, int kelvin, float out[ALITE2_CALIB_CHANNELS]);

/** Channel intensities for a dominant wavelength in nm (430..675). */
void alite2_calib_wavelength(float nm, float out[ALITE2_CALIB_CHANNELS]);

#ifdef __cplusplus
}
#endif

#endif
