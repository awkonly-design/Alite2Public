struct SparkState {
    bool active = false;
    unsigned long startTime = 0;
    unsigned long duration = 500;
};

SparkState sparks[NUM_PIXELS];
unsigned long lastFlickerTime = 0;
bool flickerToggle = false;

void updateWeldingEffect() {
    if (effect_delay_func(1)) return;

    float baseIntensity = get_effect_intensity();
    unsigned long now = millis();

    // ---- [1] pixels 1,3: 20000K flashes (alternating every 30 ms) ----
    if (now - lastFlickerTime >= 30) {
        flickerToggle = !flickerToggle;
        lastFlickerTime = now;
    }

    // ---- [2] pixels 0,2: 1700K glow fading out ----
    for (int i = 0; i < NUM_PIXELS; i++) {
        uint16_t pwm[COLOR_DEPTH] = {0};
        float result[COLOR_DEPTH];

        if (i % 2 == 1) {
            // pixels 1,3: alternating 20000K flashes
            bool isOn = ((i == 1) == flickerToggle);
            float intensity = isOn ? baseIntensity : 0.0f;
            calculateIntensities(intensity, 20000, result);

        } else {
            // pixels 0,2: 1700K with fading intensity
            SparkState& sp = sparks[i];

            if (!sp.active) {
                sp.active = true;
                sp.startTime = now;
                sp.duration = random(200, 500);  // fades out within 200..500 ms
            }

            unsigned long elapsed = now - sp.startTime;
            if (elapsed >= sp.duration) {
                sp.active = false;
                calculateIntensities(0.0f, 1700, result);  // OFF
            } else {
                float progress = 1.0f - (float)elapsed / sp.duration;
                float intensity = baseIntensity * progress;
                calculateIntensities(intensity, 1700, result);
            }
        }

        for (int j = 0; j < COLOR_DEPTH; j++) {
            pwm[j] = result[j] * MAX_PWM_VALUE;
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
