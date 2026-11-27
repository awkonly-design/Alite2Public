const int policePattern0[] = {2, -1, 2, -1, 4, -1, 4, -1};  // Red → Red → Blue → Blue
const int policePattern1[] = {2, 4, -1, 2, 4, -1};          // Red → Off → Blue → Off → Red → Blue
const int policePatternCount0 = sizeof(policePattern0) / sizeof(policePattern0[0]);
const int policePatternCount1 = sizeof(policePattern1) / sizeof(policePattern1[0]);

unsigned long policeTimer[NUM_PIXELS] = {0};
int policeStep[NUM_PIXELS] = {0};

void updatePoliceEffect() {
    if (effect_delay_func(1)) return;

    float speed = constrain(param.effect.speed, 0.0f, 1.0f);
    float intensity = get_effect_intensity();

    unsigned long now = millis();
    unsigned long baseInterval = 250;
    unsigned long minInterval = 60;
    unsigned long interval = baseInterval - (unsigned long)((baseInterval - minInterval) * speed);

    for (int i = 0; i < NUM_PIXELS; i++) {
        uint16_t pwm[COLOR_DEPTH] = {0};

        if (now - policeTimer[i] > interval) {
            policeStep[i]++;
            policeTimer[i] = now;
        }

        // pattern alternates between even and odd pixels
        bool usePattern0 = (i % 2 == 0);
        int patternIndex = 0;
        int color = -1;

        if (usePattern0) {
            patternIndex = policeStep[i] % policePatternCount0;
            color = policePattern0[patternIndex];
        } else {
            patternIndex = policeStep[i] % policePatternCount1;
            color = policePattern1[patternIndex];
        }

        if (color >= 0 && color < COLOR_DEPTH) {
            pwm[color] = intensity * MAX_PWM_VALUE;
        }

        set_led_pwm_with_effect(i, pwm);
    }
}
