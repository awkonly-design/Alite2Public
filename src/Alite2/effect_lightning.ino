// Lightning (thunderstorm): dark sky with random strikes.
// A strike is a burst of 2..5 short cold-white flashes with an afterglow between them and a slower
// fade after the last one. Some strikes are "distant": weaker and on only one or two pixels.
// Speed sets the pause between strikes (speed 0: 6..12 s, 0.5: 1.8..3.6 s, 1: 0.3..0.6 s).

struct LightningState {
    bool inStrike = false;
    bool flashOn = false;
    uint8_t flashesLeft = 0;
    uint32_t nextEvent = 0;
    uint32_t offTime = 0;           // when the current afterglow started
    float tau = 40.0f;              // afterglow time constant (ms)
    int kelvin = 7500;
    float peak[NUM_PIXELS] = {0};   // strike peak per pixel (0 = not lit by this strike)
    float level[NUM_PIXELS] = {0};  // level at the last flash (start of the afterglow)
};

LightningState lightning;

void updateLightningEffect(void)
{
    if (effect_delay_func(1)) return;

    LightningState& ls = lightning;
    float speed = constrain(param.effect.speed, 0.0f, 1.0f);
    float baseIntensity = get_effect_intensity();
    uint32_t now = millis();

    if ((int32_t)(now - ls.nextEvent) >= 0) {
        if (!ls.inStrike) {
            // ---- a new strike ----
            ls.inStrike = true;
            ls.flashesLeft = random(2, 6);
            ls.kelvin = random(6500, 9500);
            bool distant = random(100) < 35;
            if (distant) {
                for (int i = 0; i < NUM_PIXELS; i++) ls.peak[i] = 0.0f;
                int p = random(NUM_PIXELS);
                float pk = random(20, 51) / 100.0f;
                ls.peak[p] = pk;
                if (random(2) && (p + 1) < NUM_PIXELS) ls.peak[p + 1] = pk * 0.7f;
            } else {
                for (int i = 0; i < NUM_PIXELS; i++) ls.peak[i] = random(70, 101) / 100.0f;
            }
        }

        if (!ls.flashOn) {
            // ---- flash on ----
            ls.flashOn = true;
            for (int i = 0; i < NUM_PIXELS; i++) ls.level[i] = ls.peak[i] * random(55, 101) / 100.0f;
            ls.flashesLeft--;
            ls.nextEvent = now + random(30, 90);
        } else {
            // ---- flash off: afterglow ----
            ls.flashOn = false;
            ls.offTime = now;
            if (ls.flashesLeft > 0) {
                ls.tau = random(20, 60);
                ls.nextEvent = now + random(30, 160);
            } else {
                ls.inStrike = false;
                ls.tau = random(120, 400);
                float slow = 1.0f - speed;
                int minPause = (int)(300 + 6000 * slow * slow);       // 6300 .. 300 ms
                ls.nextEvent = now + random(minPause, minPause * 2);
            }
        }
    }

    float fade = ls.flashOn ? 1.0f : expf(-(float)(now - ls.offTime) / ls.tau);

    for (int i = 0; i < NUM_PIXELS; i++) {
        uint16_t pwm[COLOR_DEPTH] = {0};
        float intensity = ls.level[i] * fade * baseIntensity;

        if (intensity > 0.001f) {
            float result[COLOR_DEPTH];
            calculateIntensities(intensity, ls.kelvin, result);
            for (int j = 0; j < COLOR_DEPTH; j++) {
                pwm[j] = result[j] * MAX_PWM_VALUE;
            }
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
