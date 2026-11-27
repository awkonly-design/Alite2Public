#include <common.h>
#include <ESP32Time.h>
extern "C" {
    #include "multi_language.h"
}

uint8_t need_to_calc = true;
uint16_t artnet_buff[MAX_ARTNET_BUFF];
float output_limit_by_temp = NORMAL_LED_LIMIT;
uint16_t dmx_data_depth = 0xFF; 

void set_limit_by_boost(void)
{
    if (param.boost)
        output_limit_by_temp = BOOST_LED_LIMIT;
    else
        output_limit_by_temp = NORMAL_LED_LIMIT;
}

float get_effect_intensity(void)
{
    set_limit_by_boost();
    return output_limit_by_temp * param.effect.dimming * param.master_intensity;
}

void set_led_boost(bool flag)
{
    if (get_battery_danger() != NORMAL_BATTERY) flag = false;
    if (param.boost == flag) return;
    
    param.boost = flag;
    prefs.putBool(BOOST_KEY, flag);

    set_limit_by_boost();
}

float ledCorrectedOutput(float x) 
{
    if (x <= 0.0f) return 0.0f;       // fully off
    if (x >= 1.0f) return 1.0f;       // full brightness

    // map 0.0..1.0 to cutoff..1.0
    return LED_LOW_CUTOFF + x * (1.0f - LED_LOW_CUTOFF);
}

float ledCorrectedOutputBlue(float x) 
{
    if (x <= 0.0f) return 0.0f;       // fully off
    if (x >= 1.0f) return 1.0f;       // full brightness

    // map 0.0..1.0 to cutoff..1.0
    return LED_BLUE_LOW_CUTOFF + x * (1.0f - LED_BLUE_LOW_CUTOFF);
}

void calcPwm_by_param(float *value)
{
    set_limit_by_boost();

    float kelvin = (value[V_CCT_CH] * (MAX_KELVIN - MIN_KELVIN)) + MIN_KELVIN;
    float cross_white = 1.0 - value[V_CROSS_CH];
    float green = (value[V_GM_CH] > 0.0) ? value[V_GM_CH] : 0; 
    float magenta = (value[V_GM_CH] < 0.0) ? -1.0 * value[V_GM_CH] : 0; 
    float whiteResult[COLOR_DEPTH], colorResult[COLOR_DEPTH];

    float colorIntensity;
    switch(param.color.type)
    {
        case COLOR_WAVE:
            wavelengthIntensity((value[V_COLOR_CH] * (MAX_WAVELENGTH - MIN_WAVELENGTH)) + MIN_WAVELENGTH, colorResult);
            colorIntensity = output_limit_by_temp * value[V_CROSS_CH] * value[V_COLOR_DIM_CH] * value[V_MASTER_CH];
        break;
        case COLOR_HSI:
            hsiToColor(value[V_COLOR_H_CH], value[V_COLOR_S_CH], colorResult);
            colorIntensity = output_limit_by_temp * value[V_CROSS_CH] * value[V_COLOR_I_CH] * value[V_MASTER_CH];
        break;
        case COLOR_CLAID:
            colorResult[CYAN_INDEX] = value[V_COLOR_Cyan_CH] * Cyan_LED_LIMIT;
            colorResult[AMBER_INDEX] = value[V_COLOR_Amber_CH] * Amber_LED_LIMIT;
            colorResult[RED_INDEX] = value[V_COLOR_Deepred_CH] * Deepred_LED_LIMIT;
            colorResult[LIME_INDEX] = value[V_COLOR_Lime_CH] * Lime_LED_LIMIT;
            colorResult[BLUE_INDEX] = value[V_COLOR_Indigo_CH] * Indigo_LED_LIMIT;
            colorIntensity = output_limit_by_temp * value[V_CROSS_CH] * value[V_MASTER_CH];
        break;
        case COLOR_XY:
            xy_to_RGB(value[V_COLOR_x_CH], value[V_COLOR_y_CH], colorResult);
            colorIntensity = output_limit_by_temp * value[V_CROSS_CH] * value[V_COLOR_Y_CH] * value[V_MASTER_CH];
        break;
    }

    float whiteIntensity = output_limit_by_temp * cross_white * value[V_CCT_DIM_CH] * value[V_MASTER_CH];
    calculateIntensities(whiteIntensity, kelvin, whiteResult);

    green = cross_white * value[V_CCT_DIM_CH] * value[V_MASTER_CH] * GM_MAXIMUM_LIMIT * green;
    magenta = cross_white * value[V_CCT_DIM_CH] * value[V_MASTER_CH] * GM_MAXIMUM_LIMIT * magenta;

    localLED.pwm[LIME_INDEX]  = ledCorrectedOutput(whiteResult[LIME_INDEX]  + colorIntensity * colorResult[LIME_INDEX] + green  ) * MAX_PWM_VALUE;
    localLED.pwm[CYAN_INDEX]  = ledCorrectedOutput(whiteResult[CYAN_INDEX]  + colorIntensity * colorResult[CYAN_INDEX]          ) * MAX_PWM_VALUE;
    localLED.pwm[RED_INDEX]   = ledCorrectedOutput(whiteResult[RED_INDEX]   + colorIntensity * colorResult[RED_INDEX]  + magenta) * MAX_PWM_VALUE;
    localLED.pwm[AMBER_INDEX] = ledCorrectedOutput(whiteResult[AMBER_INDEX] + colorIntensity * colorResult[AMBER_INDEX]         ) * MAX_PWM_VALUE;
    localLED.pwm[BLUE_INDEX]  = ledCorrectedOutputBlue(whiteResult[BLUE_INDEX]  + colorIntensity * colorResult[BLUE_INDEX] + magenta) * MAX_PWM_VALUE;
}

void updateLocalLED(void)
{
    float value[MAX_ARTNET_BUFF];// size of the largest mode
    memset(value, 0x00, sizeof(float) * MAX_ARTNET_BUFF);

    //Do not use for now if (need_to_calc)
    {
        need_to_calc = false;
        
        value[V_MASTER_CH] = param.master_intensity;
        value[V_CROSS_CH] = param.cross_fade;
        value[V_CCT_DIM_CH] = param.cct_intensity;
        value[V_CCT_CH] = param.cct_pos;
        value[V_GM_CH] = param.green_magenta;
        if (param.color.type == COLOR_WAVE)
        {
            value[V_COLOR_DIM_CH] = param.color.dimming;
            value[V_COLOR_CH] = param.color.length;
        }
        else if (param.color.type == COLOR_HSI)
        {
            value[V_COLOR_I_CH] = param.color.dimming;
            value[V_COLOR_H_CH] = param.color.hs.hue;//0-360 range
            value[V_COLOR_S_CH] = param.color.hs.sat;
        }

        calcPwm_by_param(value);
    }
}

void set_boost_by_dmx_index(uint8_t index)
{
    if (artnet_buff[index] > 127) set_led_boost(true);
    else  set_led_boost(false);
}

float set_gm_value(uint16_t i)
{
    #define NEUTRAL_GM 0.05098f // 13/255, 3341/65535
    float v = (float)i / dmx_data_depth;

    if (v < NEUTRAL_GM) {
        return 0.0f;
    }

    float mapped = (v - NEUTRAL_GM) / (1.0f - NEUTRAL_GM);
    mapped = 2.0f * (mapped - 0.5f);

    if (mapped > 1.0f) mapped = 1.0f;
    else if (mapped < -1.0f) mapped = -1.0f;

    return mapped;
}

uint8_t set_artnet_pwm_update(void)
{
    float value[MAX_ARTNET_BUFF];// size of the largest mode
    memset(value, 0x00, sizeof(float) * MAX_ARTNET_BUFF);

    switch(param.dmx_mode)
    {
        case DMX_MODE_SINGLE://with EFFECT
        {
            param.color.type = COLOR_WAVE;

            value[V_MASTER_CH] = (float)artnet_buff[0] / dmx_data_depth;
            set_boost_by_dmx_index(1);
            value[V_CROSS_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[5]);
            value[V_COLOR_DIM_CH] = (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_CH] = (float)artnet_buff[7] / dmx_data_depth;

            uint8_t effect_no = artnet_buff[8] >> 4;
            uint8_t cnt_effect = lv_roller_get_option_cnt(ui_EffectRoller);

            if (effect_no > cnt_effect) effect_no = cnt_effect;
            //getRollerOptionAtIndex(ui_EffectRoller, effect_no, param.effect.name, EFFECT_NAME_LEN);

            if (effect_no == 0)
            {
                param.effect.trig = TRIG_OFF;
                calcPwm_by_param(value);
            }
            else
            {
                param.effect.trig = TRIG_ON;
                param.effect.no = effect_no - 1;

                param.effect.dimming = (float)artnet_buff[9] / dmx_data_depth;
                param.effect.speed = (float)artnet_buff[10] / dmx_data_depth;

                param.master_intensity = value[V_MASTER_CH];
                param.cross_fade = value[V_CROSS_CH];
                param.cct_intensity = value[V_CCT_DIM_CH];
                param.cct_pos = value[V_CCT_CH];
                param.green_magenta = value[V_GM_CH];
                param.color.dimming = value[V_COLOR_DIM_CH];
                param.color.length = value[V_COLOR_CH];

                return 2;
            }
        }
        break;
        case DMX_MODE_PIXELS:
        {
            param.color.type = COLOR_WAVE;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = (float)artnet_buff[0] / dmx_data_depth;
            set_boost_by_dmx_index(1);
            value[V_CROSS_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[5]);
            value[V_COLOR_DIM_CH] = (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_CH] = (float)artnet_buff[7] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            //value[V_MASTER_CH] = (float)artnet_buff[V_MASTER_CH] / dmx_data_depth;
            value[V_CROSS_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[9] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[10] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[11]);
            value[V_COLOR_DIM_CH] = (float)artnet_buff[12] / dmx_data_depth;
            value[V_COLOR_CH] = (float)artnet_buff[13] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            //value[V_MASTER_CH] = (float)artnet_buff[V_MASTER_CH] / dmx_data_depth;
            value[V_CROSS_CH] = (float)artnet_buff[14] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[15] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[16] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[17]);
            value[V_COLOR_DIM_CH] = (float)artnet_buff[18] / dmx_data_depth;
            value[V_COLOR_CH] = (float)artnet_buff[19] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm

            return 1;
        }
        break;
        case DMX_CCT_GM:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CROSS_CH] = 0.0;
            value[V_CCT_DIM_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);

            calcPwm_by_param(value);
        }
        break;
        case DMX_CCT_GM_PIXELS:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CROSS_CH] = 0.0;
            value[V_CCT_DIM_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[6]);
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[9]);
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm
            return 1;
        }
        break;
        case DMX_CCT_HSI:
        {
            param.color.type = COLOR_HSI;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CCT_DIM_CH] = 1.0;
            value[V_COLOR_I_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            value[V_CROSS_CH] = (float)artnet_buff[4] / dmx_data_depth;

            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[6] / dmx_data_depth;

            calcPwm_by_param(value);
        }
        break;
        case DMX_CCT_HSI_PIXELS:
        {
            param.color.type = COLOR_HSI;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CCT_DIM_CH] = 1.0;
            value[V_COLOR_I_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            value[V_CROSS_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[6] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[9]);
            value[V_CROSS_CH] = (float)artnet_buff[10] / dmx_data_depth;
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[11] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[12] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[13] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[14] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[15]);
            value[V_CROSS_CH] = (float)artnet_buff[16] / dmx_data_depth;
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[17] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[18] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm
            return 1;
        }
        break;
        case DMX_CCT_RGB:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CCT_DIM_CH] = 1.0;
            value[V_COLOR_Cyan_CH] = 0.0;
            value[V_COLOR_Amber_CH] = 0.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            value[V_CROSS_CH] = (float)artnet_buff[4] / dmx_data_depth;

            value[V_COLOR_Deepred_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[7] / dmx_data_depth;

            calcPwm_by_param(value);
        }
        break;
        case DMX_CCT_RGB_PIXELS:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CCT_DIM_CH] = 1.0;
            value[V_COLOR_Cyan_CH] = 0.0;
            value[V_COLOR_Amber_CH] = 0.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            value[V_CROSS_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[7] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[9] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[10]);
            value[V_CROSS_CH] = (float)artnet_buff[11] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[12] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[13] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[14] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[15] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[16] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[17]);
            value[V_CROSS_CH] = (float)artnet_buff[18] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[19] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[20] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[21] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm

            return 1;
        }
        break;
        case DMX_RGBW:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = 1.0;
            value[V_CCT_DIM_CH] = 1.0;
            value[V_CCT_CH] = (5600.0 - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN);
            value[V_GM_CH] = 0.0;
            value[V_COLOR_Cyan_CH] = 0.0;
            value[V_COLOR_Amber_CH] = 0.0;

            set_boost_by_dmx_index(0);
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_CROSS_CH] = 1.0 - ((float)artnet_buff[4] / dmx_data_depth);

            calcPwm_by_param(value);
        }
        break;
        case DMX_RGBW_PIXELS:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = 1.0;
            value[V_CCT_DIM_CH] = 1.0;
            value[V_CCT_CH] = (5600.0 - MIN_KELVIN) / ( (float)(MAX_KELVIN - MIN_KELVIN) / dmx_data_depth );
            value[V_GM_CH] = 0.0;
            value[V_COLOR_Cyan_CH] = 0.0;
            value[V_COLOR_Amber_CH] = 0.0;

            set_boost_by_dmx_index(0);
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_CROSS_CH] = 1.0 - ((float)artnet_buff[4] / dmx_data_depth);
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_COLOR_Deepred_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_CROSS_CH] = 1.0 - ((float)artnet_buff[8] / dmx_data_depth);
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_COLOR_Deepred_CH] = (float)artnet_buff[9] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[10] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[11] / dmx_data_depth;
            value[V_CROSS_CH] = 1.0 - ((float)artnet_buff[12] / dmx_data_depth);
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm
            return 1;
        }
        break;
        case DMX_CLAID:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = 1.0;
            value[V_CCT_DIM_CH] = 0.0;
            value[V_CCT_CH] = 0.0;
            value[V_GM_CH] = 0.0;
            value[V_CROSS_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_COLOR_Cyan_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_COLOR_Amber_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[5] / dmx_data_depth;

            calcPwm_by_param(value);
        }
        break;
        case DMX_CLAID_PIXELS:
        {
            param.color.type = COLOR_CLAID;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = 1.0;
            value[V_CCT_DIM_CH] = 0.0;
            value[V_CCT_CH] = 0.0;
            value[V_GM_CH] = 0.0;
            value[V_CROSS_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_COLOR_Cyan_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_COLOR_Amber_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[5] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_COLOR_Cyan_CH] = (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_COLOR_Amber_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[9] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[10] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_COLOR_Cyan_CH] = (float)artnet_buff[11] / dmx_data_depth;
            value[V_COLOR_Lime_CH] = (float)artnet_buff[12] / dmx_data_depth;
            value[V_COLOR_Amber_CH] = (float)artnet_buff[13] / dmx_data_depth;
            value[V_COLOR_Indigo_CH] = (float)artnet_buff[14] / dmx_data_depth;
            value[V_COLOR_Deepred_CH] = (float)artnet_buff[15] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm
            return 1;
        }
        break;
        case DMX_CCT_EFFECT:
        {
            param.color.type = COLOR_CLAID;

            value[V_CCT_DIM_CH] = 1.0;
            value[V_CROSS_CH] = 0.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);

            uint8_t effect_no = artnet_buff[4] >> 4;
            uint8_t cnt_effect = lv_roller_get_option_cnt(ui_EffectRoller);

            if (effect_no > cnt_effect) effect_no = cnt_effect;
            //getRollerOptionAtIndex(ui_EffectRoller, effect_no, param.effect.name, EFFECT_NAME_LEN);

            if (effect_no == 0)
            {
                param.effect.trig = TRIG_OFF;
                calcPwm_by_param(value);
            }
            else
            {
                param.effect.trig = TRIG_ON;
                param.effect.no = effect_no - 1;

                param.effect.dimming = (float)artnet_buff[5] / dmx_data_depth;
                param.effect.speed = (float)artnet_buff[6] / dmx_data_depth;

                param.master_intensity = value[V_MASTER_CH];
                param.cross_fade = value[V_CROSS_CH];
                param.cct_intensity = value[V_CCT_DIM_CH];
                param.cct_pos = value[V_CCT_CH];
                param.green_magenta = value[V_GM_CH];
                param.color.hs.hue = value[V_COLOR_H_CH];
                param.color.hs.sat = value[V_COLOR_S_CH];
                param.color.dimming = value[V_COLOR_I_CH];

                return 2;
            }
        }
        break;
        case DMX_CCT_XY:
        {
            param.color.type = COLOR_XY;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CCT_DIM_CH] = 1.0;
            value[V_COLOR_Y_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            value[V_CROSS_CH] = (float)artnet_buff[4] / dmx_data_depth;

            value[V_COLOR_x_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[6] / dmx_data_depth;

            calcPwm_by_param(value);
        }
        break;
        case DMX_CCT_XY_PIXELS:
        {
            param.color.type = COLOR_XY;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_CCT_DIM_CH] = 1.0;
            value[V_COLOR_Y_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[3]);
            value[V_CROSS_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[6] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[9]);
            value[V_CROSS_CH] = (float)artnet_buff[10] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[11] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[12] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_MASTER_CH] = (float)artnet_buff[13] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[14] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[15]);
            value[V_CROSS_CH] = (float)artnet_buff[16] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[17] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[18] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm

            return 1;
        }
        break;
        case DMX_XY:
        {
            param.color.type = COLOR_XY;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = 1.0;
            value[V_CCT_DIM_CH] = 0.0;
            value[V_CCT_CH] = 0.0;
            value[V_GM_CH] = 0.0;
            value[V_CROSS_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_COLOR_Y_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[3] / dmx_data_depth;

            calcPwm_by_param(value);
        }
        break;
        case DMX_XY_PIXELS:
        {
            param.color.type = COLOR_XY;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            value[V_MASTER_CH] = 1.0;
            value[V_CCT_DIM_CH] = 0.0;
            value[V_CCT_CH] = 0.0;
            value[V_GM_CH] = 0.0;
            value[V_CROSS_CH] = 1.0;

            set_boost_by_dmx_index(0);
            value[V_COLOR_Y_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[3] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_COLOR_Y_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[5] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[6] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_COLOR_Y_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_COLOR_x_CH] = (float)artnet_buff[8] / dmx_data_depth;
            value[V_COLOR_y_CH] = (float)artnet_buff[9] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm
            return 1;
        }
        break;
        case DMX_FULL://with EFFECT
        {
            param.color.type = COLOR_HSI;

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CROSS_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[5]);
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_COLOR_I_CH] = (float)artnet_buff[8] / dmx_data_depth;

            uint8_t effect_no = artnet_buff[9] >> 4;
            uint8_t cnt_effect = lv_roller_get_option_cnt(ui_EffectRoller);

            if (effect_no > cnt_effect) effect_no = cnt_effect;
            //getRollerOptionAtIndex(ui_EffectRoller, effect_no, param.effect.name, EFFECT_NAME_LEN);

            if (effect_no == 0)
            {
                param.effect.trig = TRIG_OFF;
                calcPwm_by_param(value);
            }
            else
            {
                param.effect.trig = TRIG_ON;
                param.effect.no = effect_no - 1;

                param.effect.dimming = (float)artnet_buff[10] / dmx_data_depth;
                param.effect.speed = (float)artnet_buff[11] / dmx_data_depth;

                param.master_intensity = value[V_MASTER_CH];
                param.cross_fade = value[V_CROSS_CH];
                param.cct_intensity = value[V_CCT_DIM_CH];
                param.cct_pos = value[V_CCT_CH];
                param.green_magenta = value[V_GM_CH];
                param.color.hs.hue = value[V_COLOR_H_CH];
                param.color.hs.sat = value[V_COLOR_S_CH];
                param.color.dimming = value[V_COLOR_I_CH];

                return 2;
            }
        }
        break;
        case DMX_FULL_PIXELS:
        {
            param.color.type = COLOR_HSI;
            param.effect.trig = TRIG_OFF;
            //getRollerOptionAtIndex(ui_EffectRoller, 0, param.effect.name, EFFECT_NAME_LEN);//set this to off

            set_boost_by_dmx_index(0);
            value[V_MASTER_CH] = (float)artnet_buff[1] / dmx_data_depth;
            value[V_CROSS_CH] = (float)artnet_buff[2] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[3] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[4] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[5]);
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[6] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[7] / dmx_data_depth;
            value[V_COLOR_I_CH] = (float)artnet_buff[8] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(0, localLED.pwm);//update pwm

            value[V_CROSS_CH] = (float)artnet_buff[9] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[10] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[11] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[12]);
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[13] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[14] / dmx_data_depth;
            value[V_COLOR_I_CH] = (float)artnet_buff[15] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(1, localLED.pwm);//update pwm

            value[V_CROSS_CH] = (float)artnet_buff[16] / dmx_data_depth;
            value[V_CCT_DIM_CH] = (float)artnet_buff[17] / dmx_data_depth;
            value[V_CCT_CH] = (float)artnet_buff[18] / dmx_data_depth;
            value[V_GM_CH] = set_gm_value(artnet_buff[19]);
            value[V_COLOR_H_CH] = 360.0 * (float)artnet_buff[20] / dmx_data_depth;
            value[V_COLOR_S_CH] = (float)artnet_buff[21] / dmx_data_depth;
            value[V_COLOR_I_CH] = (float)artnet_buff[22] / dmx_data_depth;
            calcPwm_by_param(value);
            set_led_pwm_with_effect(2, localLED.pwm);//update pwm

            return 1;
        }
        break;
    }

    return 0;
}

// DmxModeDropdown entry <-> DMX mode: entries 0..DMX_XY_PIXELS are the built-in charts, the entries after them
// are the charts added after DMX_MODE_PIXELS (so DMX_MODE_SINGLE / DMX_MODE_PIXELS keep their stored values).
uint8_t dmx_mode_from_menu(uint32_t index)
{
    return index <= DMX_XY_PIXELS ? index : index + (DMX_MODE_PIXELS - DMX_XY_PIXELS);
}
uint32_t menu_from_dmx_mode(uint8_t mode)
{
    return mode > DMX_MODE_PIXELS ? mode - (DMX_MODE_PIXELS - DMX_XY_PIXELS) : mode;
}

void wireless_callback(uint8_t *data, uint16_t size)
{
    if (param.dmx_bits == DMX_16BITS) size = ((size - 1) >> 1) + 1;//because of 1 byte boost channel
    if (size > MAX_ARTNET_BUFF) size = MAX_ARTNET_BUFF;

    //dbg.printf("%d> %d %d %d %d %d %d\n", size, data[0], data[1], data[2], data[3], data[4], data[5]);

    if (param.dmx_bits == DMX_8BITS) 
    {
        dmx_data_depth = 0xFF;
        for(int i = 0; i < size; i++)
            artnet_buff[i] = (uint16_t)data[i];
    }
    else 
    {
        artnet_buff[0] = data[0];//boost channel (1 byte)

        dmx_data_depth = 0xFFFF;
        for(int i = 1; i < size; i++)
            artnet_buff[i] = ((uint16_t)data[2 * i - 1] << 8) | (uint16_t)data[2 * i];

        //dbg.printf("%d>%d %d %d %d\n", size, artnet_buff[0], artnet_buff[1], artnet_buff[2], artnet_buff[3]);
    }
    set_return_to_local();
}

void update_artnet_message_string(char *str, size_t maxlen)
{
    String ip = "";

    if (display_led == DISPLAY_LED_ARTNET)
        ip = WiFi.localIP().toString();  // keep the temporary String alive
        
    snprintf(str, maxlen, get_multi_language_format("Pree and hold\nF2 to turn off\nwireless\n\nCH:%d  U:%d\n%s", wifiParam.lang),
        param.dmx_ch, param.universe, 
        ip.c_str());  // c_str() of the stored String
}

void turn_off_blackout_when_trig_blackout(void)
{
    if (param.effect.trig == TRIG_BLACKOUT)
    {
        param.effect.trig = TRIG_OFF;
        set_blackout(false);
    }
}

void set_artnet_pwm_callback(uint8_t *data, uint16_t size)
{
    char str[128];

    wireless_callback(data, size);
    if (display_led != DISPLAY_LED_ARTNET)
    {
        turn_off_blackout_when_trig_blackout();
        display_led = DISPLAY_LED_ARTNET;
        update_artnet_message_string(str, sizeof(str));  // pass the buffer size
        show_message_box(ARTNET_TITLE, str);
    }
}

void set_ble_pwm_callback(uint8_t *data, uint16_t size)
{
    char str[128];

    wireless_callback(data, size);
    if (display_led != DISPLAY_LED_BLE)
    {
        turn_off_blackout_when_trig_blackout();
        display_led = DISPLAY_LED_BLE;
        sprintf(str, get_multi_language_format("Pree and hold\nF2 to turn off\nwireless\n\nCH:%d  U:%d", wifiParam.lang),
            param.dmx_ch, param.universe);        
        show_message_box(BLUETOOTH_TITLE, str);
    }
}

void set_dmx512_pwm_callback(uint8_t *data, uint16_t size)
{
    char str[128];

    wireless_callback(data, size);
    if (display_led != DISPLAY_LED_DMX512)
    {
        turn_off_blackout_when_trig_blackout();
        display_led = DISPLAY_LED_DMX512;
        sprintf(str, get_multi_language_format("Pree and hold\nF2 to turn off\nwireless\n\nCH:%d  U:%d", wifiParam.lang),
            param.dmx_ch, param.universe);
        show_message_box(DMX512_TITLE, str);
    }
}
