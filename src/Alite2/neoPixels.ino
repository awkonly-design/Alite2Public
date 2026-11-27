#include <Adafruit_NeoPixel.h>

#ifdef USE_NEO_PIXEL

Adafruit_NeoPixel pixels = Adafruit_NeoPixel(RGB_DEPTH, NEO_PIN, NEO_GRB + NEO_KHZ800);  // init
void neoPixelInit(void)
{
    pixels.begin();    // start the NeoPixel library (call in setup())
    pixels.clear();
    pixels.show();  // output the values  
}

#endif
/*
pixels.getPixelColor(index);   // colour of a pixel, returns uint32_t
pixels.numPixels();  // number of LEDs
pixels.getPin();           // data pin number 
pixels.Color(R, G, B, W); // returns a 32-bit colour W:R:G:B   
pixels.Color(R, G, B);       // returns a 32-bit colour W:R:G:B       
pixels.ColorHSV(H, S, V);       // returns a 32-bit colour, arguments 0-255, S=255 and V=255 by default
pixels.canShow();       // ready to show? (bool)
pixels.fill(color, first, count);       // set count LEDs (default 0) from first (default 0) to a 32-bit colour
pixels.updateLength(n);       // change the number of LEDs
pixels.updateType(type);       // 
*/