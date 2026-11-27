unsigned long ambulanceTimer[NUM_PIXELS] = {0};
bool ambulanceOn[NUM_PIXELS] = {false};

void updateAmbulanceEffect() {
    if (effect_delay_func(1)) return;

    float speed = constrain(param.effect.speed, 0.0f, 1.0f);
    float intensity = get_effect_intensity();

    unsigned long now = millis();
    unsigned long baseInterval = 600;   // slow blink
    unsigned long minInterval = 150;
    unsigned long interval = baseInterval - (unsigned long)((baseInterval - minInterval) * speed);

    for (int i = 0; i < NUM_PIXELS; i++) {
        uint16_t pwm[COLOR_DEPTH] = {0};

        // blink timing
        if (now - ambulanceTimer[i] > interval) {
            ambulanceOn[i] = !ambulanceOn[i];
            ambulanceTimer[i] = now;
        }

        // assumes index 2 of COLOR_DEPTH is green (0:R, 1:A, 2:G, 3:B, 4:W)
        if (ambulanceOn[i]) {
            pwm[2] = intensity * MAX_PWM_VALUE;  // green on
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
