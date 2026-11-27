struct FireworkPixel {
    float brightness;         // current brightness
    float targetBrightness;   // target brightness of a burst
    float fadeProgress;       // fade progress 0.0..1.0
    float fadeSpeed;          // fade speed
    unsigned long nextBurst;  // time of the next burst
    bool initialized;
};

FireworkPixel firework_pixels[NUM_PIXELS][COLOR_DEPTH] = {};  // 2 positions x 5 colours = 10 pixels

void updateFireworkEffect() {
    if (effect_delay_func(1)) return;

    float speed = param.effect.speed;
    if (speed < 0.0f) speed = 0.0f;
    if (speed > 1.0f) speed = 1.0f;

    const float fadeCurve = 1.5f;
    unsigned long now = millis();

    for (int i = 0; i < NUM_PIXELS; i++) {
        float result[COLOR_DEPTH];
        uint16_t pwm[COLOR_DEPTH];

        for (int j = 0; j < COLOR_DEPTH; j++) {
            FireworkPixel& p = firework_pixels[i][j];

            if (!p.initialized) {
                p.brightness = 0.0f;
                p.fadeProgress = 1.0f;
                p.targetBrightness = 1.0f;
                p.fadeSpeed = 0.01f;
                p.nextBurst = now + random(500, 3000);
                p.initialized = true;
            }

            // burst?
            if (now >= p.nextBurst) {
                p.targetBrightness = random(60, 100) / 100.0f;
                p.fadeProgress = 0.0f;
                p.fadeSpeed = (0.005f + random(5, 25) / 10000.0f) * 0.33f;


                // speed controls how often bursts happen
                float speedFactor = 1.5f - speed;  // faster -> smaller factor
                p.nextBurst = now + random(1000, 4000) * speedFactor;
            }

            // fade
            if (p.fadeProgress < 1.0f) {
                p.fadeProgress += p.fadeSpeed;
                if (p.fadeProgress > 1.0f) p.fadeProgress = 1.0f;
            }

            // apply the fade curve
            p.brightness = p.targetBrightness * (1.0f - pow(p.fadeProgress, fadeCurve));

            // brightness
            float intensity = p.brightness * get_effect_intensity();
            result[j] = intensity;
            pwm[j] = result[j] * MAX_PWM_VALUE;
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
