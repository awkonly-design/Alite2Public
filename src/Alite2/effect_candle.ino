// internal state (each pixel moves on its own)
float candle_t[] = {0.0f, 100.0f, 30.0f, 60.0f};  // time offset per pixel (they drift apart randomly)
const float candleKelvinBase = 1700.0f;
const float candleKelvinRange = 100.0f;

void updateCandleEffect(void) 
{
    if (effect_delay_func(1)) return;

    float speed = constrain(param.effect.speed, 0.0f, 1.0f);

    for (int i = 0; i < NUM_PIXELS; i++) 
    {
        uint16_t pwm[COLOR_DEPTH];
        float result[COLOR_DEPTH];

        // individual speed variation per pixel
        float s = 0.1f + speed * 0.6f + random(-5, 6) / 100.0f;  // slightly different speed per pixel
        candle_t[i] += 0.03f * s;

        // per-pixel flicker waveform (mixed for variety)
        float flicker = sin(candle_t[i])
                      + 0.4f * sin(candle_t[i] * 1.7f + i)
                      + 0.3f * sin(candle_t[i] * 2.5f + random(0, 1000) / 1000.0f);

        float randOffset = random(-12, 13) / 100.0f;  // -0.12 ~ +0.12

        float rawIntensity = 0.5f + flicker * 0.2f + randOffset;
        rawIntensity = constrain(rawIntensity, 0.0f, 1.0f);

        int kelvin = (int)(candleKelvinBase + flicker * candleKelvinRange + random(-30, 31));
        kelvin = constrain(kelvin, 1700, 2200);  // limit to 1700K minimum

        calculateIntensities(rawIntensity * get_effect_intensity(), kelvin, result);

        for (int j = 0; j < COLOR_DEPTH; j++)
            pwm[j] = result[j] * MAX_PWM_VALUE;

        set_led_pwm_with_effect(i, pwm);
    }
}
