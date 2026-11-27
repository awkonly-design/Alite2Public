#include <ESP32Encoder.h>//version 0.11.8
//#include "common.h"

// ESP32Encoder instances
ESP32Encoder rotaryEncoder;
ESP32Encoder secondEncoder;

// jitter filtering
#define MIN_MOVEMENT_THRESHOLD (4 - 1)  // minimum movement (FullQuad: ±4 per detent; minus 1 because timing can give 3 or 5)


void rotary_onButtonClick()
{
    static unsigned long lastTimePressed = 0; // Soft debouncing
    if (millis() - lastTimePressed < 500)
    {
        return;
    }
    lastTimePressed = millis();
    dbg.print("button pressed ");
    dbg.print(millis());
    dbg.println(" milliseconds after restart");
}

int8_t rotaryEncoderLoop(void)
{
    static int32_t prevCount = 0;
    
    int32_t currentCount = rotaryEncoder.getCount();
    int32_t hwDiff = currentCount - prevCount;  // hardware count difference
/*    
    dbg.print("HW Count: ");
    dbg.print(currentCount);
    dbg.print(", Diff: ");
    dbg.println(hwDiff);
*/
    // debug: hardware count
    if (abs(hwDiff) >= MIN_MOVEMENT_THRESHOLD) {
        prevCount = currentCount;
        return (hwDiff / MIN_MOVEMENT_THRESHOLD);
    }
    
    return 0;  // no change
}

int8_t secondEncoderLoop(void)
{
    static int32_t prevCount = 0;
    
    int32_t currentCount = secondEncoder.getCount();
    int32_t hwDiff = currentCount - prevCount;  // hardware count difference
/*    
    dbg.print("HW Count: ");
    dbg.print(currentCount);
    dbg.print(", Diff: ");
    dbg.println(hwDiff);
*/
    // debug: hardware count
    if (abs(hwDiff) >= MIN_MOVEMENT_THRESHOLD) {
        prevCount = currentCount;
        return (hwDiff / MIN_MOVEMENT_THRESHOLD);
    }
    
    return 0;  // no change
}

// ESP32Encoder uses the hardware counter, so no ISR is needed

void rotaryEncoderInit(void)
{
    // ESP32Encoder init in FullQuad mode
    rotaryEncoder.attachFullQuad(ROTARY_ENCODER_A_PIN, ROTARY_ENCODER_B_PIN);
    rotaryEncoder.setCount(0);
    
    // hardware debouncing (built-in)
    // range 0-1023; 100-300 filters jitter well
    rotaryEncoder.setFilter(200); // too high makes it sluggish
}

void secondEncoderInit(void)
{
    // ESP32Encoder init in FullQuad mode
    secondEncoder.attachFullQuad(SECOND_ENCODER_A_PIN, SECOND_ENCODER_B_PIN);
    secondEncoder.setCount(0);
    
    // hardware debouncing (built-in)
    // range 0-1023; 100-300 filters jitter well
    secondEncoder.setFilter(200); // too high makes it sluggish
}

void skipEncoders(void)
{
    // ESP32Encoder uses the hardware counter, so no skip function is needed
    // read the current count to update the state instead
    rotaryEncoder.getCount();
    secondEncoder.getCount();
}

