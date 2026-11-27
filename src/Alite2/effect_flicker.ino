struct FlickerState {
    bool flickering = false;
    int remainingBurst = 0;
    unsigned long nextEvent = 0;
};

// state per pixel
FlickerState flickerState[NUM_PIXELS];

void updateFlickerSparseEffect() {
    if (effect_delay_func(1)) return;

    float speed = constrain(param.effect.speed, 0.0f, 1.0f);
    float effectDim = constrain(param.effect.dimming, 0.0f, 1.0f);

    unsigned long now = millis();

    updateLocalLED();
    uint16_t basePwm[COLOR_DEPTH];
    for (int j = 0; j < COLOR_DEPTH; j++) {
        basePwm[j] = localLED.pwm[j];
    }

    for (int i = 0; i < NUM_PIXELS; i++) {
        FlickerState& fs = flickerState[i];
        uint16_t pwm[COLOR_DEPTH];

        if (now >= fs.nextEvent) {
            if (fs.flickering) {
                fs.remainingBurst--;
                if (fs.remainingBurst <= 0) {
                    fs.flickering = false;

                    // speed 0 -> up to 6000 ms, speed 1 -> at least 3000 ms
                    int baseMin = (int)(4000 - 3000 * speed); // 4000~1000
                    int baseMax = baseMin + 2000;             // 6000~3000
                    fs.nextEvent = now + random(baseMin, baseMax);
                } else {
                    fs.nextEvent = now + random(40, 100); // interval to the next flicker
                }
            } else {
                fs.flickering = true;
                fs.remainingBurst = random(1, 4);           // 1..3 flickers per burst
                fs.nextEvent = now + random(40, 100);
            }
        }

        float flickerIntensity = fs.flickering ? 0.0f : 1.0f;
        float intensityScale = effectDim * flickerIntensity;
        if (intensityScale <= 0.0f) {
            memset(pwm, 0, sizeof(pwm));
        } else if (intensityScale >= 0.999f) {
            memcpy(pwm, basePwm, sizeof(pwm));
        } else {
            for (int j = 0; j < COLOR_DEPTH; j++) {
                pwm[j] = (uint16_t)(basePwm[j] * intensityScale);
            }
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
