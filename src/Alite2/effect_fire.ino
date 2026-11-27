
// internal state
float t[] = {0.0f, 100.0f, 30.0f, 60.0f};  // time offset per pixel
const float kelvinBase = 2200.0f;
const float kelvinRange = 300.0f;

uint32_t effect_delay = 0;
bool effect_delay_func(uint8_t delay)
{
    if ((millis() - effect_delay) < delay) return true;
    effect_delay = millis();

    return false;
}

// update
void updateFireEffect(void) 
{
    if (effect_delay_func(1)) return;

    uint16_t pwm[COLOR_DEPTH];
    float result[COLOR_DEPTH];
    float speed = param.effect.speed;

    // state
    float intensity;  // 0.0 ~ 1.0
    int kelvin;       // 1700 ~ 3000

    static bool pixel_speed_init = false;
    static float pixel_speed_scale[NUM_PIXELS];

    if (!pixel_speed_init) {
        for (int i = 0; i < NUM_PIXELS; i++) {
            pixel_speed_scale[i] = 0.8f + (random(0, 41) / 100.0f);  // base speed variation per pixel
        }
        pixel_speed_init = true;
    }

    // keep speed within a sensible range
    if (speed < 0.01f) speed = 0.01f;
    if (speed > 1.0f) speed = 1.0f;

    float s = 0.2f + speed * 1.2f;

    for (int i = 0; i < NUM_PIXELS; i++) 
    {
        // advance time (with speed)
        //t[i] += 0.05f * (0.5f + speed);  // keep a minimum speed
        float jitter = 1.0f + (random(-5, 6) * 0.01f);  // small speed jitter per frame
        float local_speed = s * pixel_speed_scale[i] * jitter;
        t[i] += 0.025f * local_speed;

        // composite flame waveform
        float flicker = sin(t[i]) + sin(t[i] * 0.6f + i);
        float randOffset = random(-10, 11) / 100.0f; // -0.10 ~ 0.10

        // normalised intensity (0.0..1.0)
        float rawIntensity = 0.5f + flicker * 0.25f + randOffset;
        if (rawIntensity < 0.0f) rawIntensity = 0.0f;
        if (rawIntensity > 1.0f) rawIntensity = 1.0f;
        intensity = rawIntensity;

        // colour temperature (2200 ± range)
        float kelvinF = kelvinBase + flicker * kelvinRange + random(-20, 21);
        if (kelvinF < 1700) kelvinF = 1700;
        if (kelvinF > 3000) kelvinF = 3000;
        kelvin = (int)kelvinF;
    
        //control pwm
        calculateIntensities(intensity * get_effect_intensity(), kelvin, result);
        for(int j = 0; j < COLOR_DEPTH; j++)
            pwm[j] = result[j] * MAX_PWM_VALUE;
        set_led_pwm_with_effect(i, pwm);
    }
}
