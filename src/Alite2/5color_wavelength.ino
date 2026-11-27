#include "common.h"
#include <math.h>

// Dominant wavelength (nm) -> channel intensities, from the Alite2Calib library
void wavelengthIntensity(float targetWavelength, float intensities[COLOR_DEPTH])
{
    alite2_calib_wavelength(targetWavelength, intensities);
}

void hsiToColor(float H, float S, float intensities[COLOR_DEPTH])
{
    float R,G,B;
    // normalise hue to 0..360
    H = fmod(H, 360.0);
    if (H < 0) H += 360.0;

    float frac = (H / 60.0);   // 0~6
    int sector = int(frac);    // 0,1,2,3,4,5
    float f = frac - sector;   // fractional part (0..1)

    // base RGB (HSV, I=1.0)
    float p = (1.0 - S);
    float q = (1.0 - S * f);
    float t = (1.0 - S * (1.0 - f));

    switch(sector) 
    {
        case 0: R=1.0; G=t;   B=p;   break; // Red→Yellow
        case 1: R=q;   G=1.0; B=p;   break; // Yellow→Green
        case 2: R=p;   G=1.0; B=t;   break; // Green→Cyan
        case 3: R=p;   G=q;   B=1.0; break; // Cyan→Blue
        case 4: R=t;   G=p;   B=1.0; break; // Blue→Magenta
        default:R=1.0; G=p;   B=q;   break; // Magenta→Red
    }
  
    intensities[CYAN_INDEX] = 0.0;
    intensities[AMBER_INDEX] = 0.0;
    intensities[RED_INDEX] =  R * Deepred_LED_LIMIT;
    intensities[LIME_INDEX] = G * Lime_LED_LIMIT;
    intensities[BLUE_INDEX] = B * Indigo_LED_LIMIT;
}

void xy_to_RGB(float x, float y, float intensities[COLOR_DEPTH]) {
    intensities[CYAN_INDEX] = 0.0;
    intensities[AMBER_INDEX] = 0.0;

    if (y <= 0.0) 
    {  // avoid y=0
        //intensities[RED_INDEX] =  0.0;
        //intensities[LIME_INDEX] = 0.0;
        //intensities[BLUE_INDEX] = 0.0;
        //return;
        y = 0.0001;
    }

    const float Y = 1.0f;
    float Y_over_y = Y / y;
    float X = Y_over_y * x;
    float Z = Y_over_y * (1.0f - x - y);

    float R =  3.2406f * X - 1.5372f * Y - 0.4986f * Z;
    float G = -0.9689f * X + 1.8758f * Y + 0.0415f * Z;
    float B =  0.0557f * X - 0.2040f * Y + 1.0570f * Z;

    // clamp to 0.0..1.0
    if (R < 0.0f) R = 0.0f;
    if (R > 1.0f) R = 1.0f;
    if (G < 0.0f) G = 0.0f;
    if (G > 1.0f) G = 1.0f;
    if (B < 0.0f) B = 0.0f;
    if (B > 1.0f) B = 1.0f;

    intensities[RED_INDEX] =  R * Deepred_LED_LIMIT;
    intensities[LIME_INDEX] = G * Lime_LED_LIMIT;
    intensities[BLUE_INDEX] = B * Indigo_LED_LIMIT;
}

