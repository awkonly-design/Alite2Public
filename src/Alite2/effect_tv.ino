struct TVPixel {
    float brightness;
    float targetBrightness;
    float transitionProgress; // 0.0 ~ 1.0
    float transitionSpeed;
    unsigned long nextChange;
    bool initialized;
};

TVPixel tv_pixels[NUM_PIXELS][COLOR_DEPTH] = {};

void updateTVEffect() {
    if (effect_delay_func(1)) return;

    float speed = param.effect.speed;
    if (speed < 0.0f) speed = 0.0f;
    if (speed > 1.0f) speed = 1.0f;

    const float transitionCurve = 2.0f;
    unsigned long now = millis();

    for (int i = 0; i < NUM_PIXELS; i++) {
        float result[COLOR_DEPTH];
        uint16_t pwm[COLOR_DEPTH];

        for (int j = 0; j < COLOR_DEPTH; j++) {
            TVPixel& p = tv_pixels[i][j];

            if (!p.initialized) {
                p.brightness = 0.0f;
                p.targetBrightness = 0.0f;
                p.transitionProgress = 1.0f;
                p.transitionSpeed = 0.01f;
                p.nextChange = now + random(100, 1000);
                p.initialized = true;
            }

            if (now >= p.nextChange) {
                // overall brightness range reduced by 30%
                float base = random(7, 35) / 100.0f;  // darker overall
                if (j == 0 || j == 4) {
                    base += random(0, 20) / 100.0f;
                }
                p.targetBrightness = min(base, 1.0f);

                p.transitionProgress = 0.0f;

                // slower: smaller overall factor
                p.transitionSpeed = (0.002f + random(2, 10) / 10000.0f) * (0.15f + speed * 0.5f);

                // longer change period: 200..1000 ms
                p.nextChange = now + random(200, 1000);
            }

            if (p.transitionProgress < 1.0f) {
                p.transitionProgress += p.transitionSpeed;
                if (p.transitionProgress > 1.0f) p.transitionProgress = 1.0f;
            }

            float t = pow(p.transitionProgress, transitionCurve);
            p.brightness = p.brightness * (1.0f - t) + p.targetBrightness * t;

            // 30% dimmer overall
            float dimmed = p.brightness * 0.7f;

            float intensity = dimmed * get_effect_intensity();
            result[j] = intensity;
            pwm[j] = result[j] * MAX_PWM_VALUE;
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
