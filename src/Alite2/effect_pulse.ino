static float pulsePhase = 0.0f;

void updatePulseEffect(void)
{
    if (effect_delay_func(1)) return;

    float speed = constrain(param.effect.speed, 0.0f, 1.0f);

    // phase step depends on speed (slow ~0.002f .. fast ~0.06f)
    float phaseStep = (0.002f + speed * 0.058f) / 2.0f;
    pulsePhase += phaseStep;
    if (pulsePhase > 2.0f * PI) {
        pulsePhase -= 2.0f * PI;
    }

    float wave = 0.5f + 0.5f * sinf(pulsePhase);  // sine wave in 0.0f .. 1.0f
    float originalMaster = param.master_intensity;
    float modulatedMaster = constrain(originalMaster * wave, 0.0f, 1.0f) * get_effect_intensity();

    param.master_intensity = modulatedMaster;
    updateLocalLED();

    for (int i = 0; i < NUM_PIXELS; i++) {
        set_led_pwm_with_effect(i, localLED.pwm);
    }

    param.master_intensity = originalMaster;
}

