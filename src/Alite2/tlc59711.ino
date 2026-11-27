/*************************************************** 
  This is an example for our Adafruit 12-channel PWM/LED driver

  Pick one up today in the adafruit shop!
  ------> http://www.adafruit.com/products/

  These drivers uses SPI to communicate, 2 pins are required to  
  interface: Data and Clock. The boards are chainable

  Adafruit invests time and resources providing this open source code, 
  please support Adafruit and open-source hardware by purchasing 
  products from Adafruit!

  Written by Limor Fried/Ladyada for Adafruit Industries.  
  BSD license, all text above must be included in any redistribution
 ****************************************************/

#include "tlc59711_drv.h" // local copy of Adafruit TLC59711 1.3.4
#include "common.h"
#include <SPI.h>

Adafruit_TLC59711 tlc = Adafruit_TLC59711(NUM_TLC59711, TLC59711_CLK, TLC59711_DAT);

uint16_t middle_pwm_buff[NUM_TLC59711 * TLC59711_CHANNELS];

uint16_t avg_colors[NUM_TLC59711 * TLC59711_CHANNELS][AVG_COUNT];
uint32_t avg_sum[NUM_TLC59711 * TLC59711_CHANNELS];
uint16_t avg_pos = 0, avg_count = AVG_COUNT;
uint8_t avg_shift = AVG_SHIFT;
bool black_out = false;

void init_led(void)
{
    uint8_t i;

    tlc.begin();
    //tlc.simpleSetBrightness(10);//set lowest power consumption
    tlc.simpleSetBrightness(77);//remove flicker in low brightness
    all_led_off();

    dbg.println("TLC59711 Initial");
    memset(middle_pwm_buff, 0x00, NUM_TLC59711 * 12 * sizeof(uint16_t));
    memset(localLED.pwm, 0x00, sizeof(uint16_t) * COLOR_DEPTH);

    for(i = 0; i < (NUM_TLC59711 * TLC59711_CHANNELS); i++)
    {
        memset(avg_colors[i], 0x00, AVG_COUNT * sizeof(uint16_t));
        avg_sum[i] = 0;
    }
}

void set_blackout(bool flag)
{
    black_out = flag;
}

void set_avg_count(uint16_t shift)
{
    uint8_t i;
    
    if (shift > AVG_SHIFT) return;

    if (shift != avg_shift)
    {
        for(i = 0; i < (NUM_TLC59711 * TLC59711_CHANNELS); i++)
        {
            memset(avg_colors[i], 0x00, AVG_COUNT * sizeof(uint16_t));
            avg_sum[i] = 0;
        }
        avg_pos = 0;

        avg_shift = shift;
        avg_count = (1 << shift);

        //dbg.printf("avg: %d %d\n", avg_count, avg_shift);
    }
}

uint16_t avg_color(uint16_t value, uint16_t index)
{
    avg_sum[index] -= avg_colors[index][avg_pos];
    avg_sum[index] += value;
    avg_colors[index][avg_pos] = value;

    return (avg_sum[index] >> avg_shift);
}

void set_led_pwm(void)
{
    if (black_out)
        memset(localLED.pwm, 0x00, sizeof(uint16_t) * COLOR_DEPTH);

    uint16_t a,l,b,r,c;

    a = localLED.pwm[AMBER_INDEX];
    l = localLED.pwm[LIME_INDEX];
    b = localLED.pwm[BLUE_INDEX];
    r = localLED.pwm[RED_INDEX];
    c = localLED.pwm[CYAN_INDEX];

    //Display to LED
    //dbg.printf("%d %d %d %d %d\n", a, l, b, r, c);

    middle_pwm_buff[A_PWM_CH] = a;//Amber
    middle_pwm_buff[L_PWM_CH] = l;//Lime
    middle_pwm_buff[B_PWM_CH] = b;//Blue
    middle_pwm_buff[R_PWM_CH] = r;//Red
    middle_pwm_buff[C_PWM_CH] = c;//Cyan

    middle_pwm_buff[6 + A_PWM_CH] = a;//Amber
    middle_pwm_buff[6 + L_PWM_CH] = l;//Lime
    middle_pwm_buff[6 + B_PWM_CH] = b;//Blue
    middle_pwm_buff[6 + R_PWM_CH] = r;//Red
    middle_pwm_buff[6 + C_PWM_CH] = c;//Cyan

#if (NUM_TLC59711 == 2)
    middle_pwm_buff[12 + A_PWM_CH] = a;//Amber
    middle_pwm_buff[12 + L_PWM_CH] = l;//Lime
    middle_pwm_buff[12 + B_PWM_CH] = b;//Blue
    middle_pwm_buff[12 + R_PWM_CH] = r;//Red
    middle_pwm_buff[12 + C_PWM_CH] = c;//Cyan

    middle_pwm_buff[18 + A_PWM_CH] = a;//Amber
    middle_pwm_buff[18 + L_PWM_CH] = l;//Lime
    middle_pwm_buff[18 + B_PWM_CH] = b;//Blue
    middle_pwm_buff[18 + R_PWM_CH] = r;//Red
    middle_pwm_buff[18 + C_PWM_CH] = c;//Cyan
#endif
    //tlc.write();
}

void set_led_pwm_with_effect(uint8_t ch, uint16_t pwm[COLOR_DEPTH])
{
    if (black_out)
        memset(pwm, 0x00, sizeof(uint16_t) * COLOR_DEPTH);

    switch(ch)//realign
    {
        case 0: ch = PIX0_ADDR; break;
        case 1: ch = PIX1_ADDR; break;
        case 2: ch = PIX2_ADDR; break;
        case 3: ch = PIX3_ADDR; break;
    }

    //dbg.printf("%d %d %d %d %d\n", a, l, b, r, c);
    middle_pwm_buff[ch*6 + A_PWM_CH] = pwm[AMBER_INDEX];//Amber
    middle_pwm_buff[ch*6 + L_PWM_CH] = pwm[LIME_INDEX];//Lime
    middle_pwm_buff[ch*6 + B_PWM_CH] = pwm[BLUE_INDEX];//Blue
    middle_pwm_buff[ch*6 + R_PWM_CH] = pwm[RED_INDEX];//Red
    middle_pwm_buff[ch*6 + C_PWM_CH] = pwm[CYAN_INDEX];//Cyan

    //tlc.write();
}

uint32_t tlc_delay = 0;
void send_tlc_datas(void)
{
    uint8_t i;
    uint16_t value;

    if ((millis() - tlc_delay) >= 10)//10ms delay for fixing blink leds
    {
        tlc_delay = millis();

        for(i = 0; i < (NUM_TLC59711 * TLC59711_CHANNELS); i++)
        {
#ifdef INVERT_TLC59711
            tlc.setPWM(i, 0xFFFF - avg_color(middle_pwm_buff[i], i));
#else
            tlc.setPWM(i, avg_color(middle_pwm_buff[i], i));
#endif
        }

        avg_pos++;
        if (avg_pos >= avg_count) avg_pos = 0;

        tlc.write();
    }
}

void all_led_off(void)
{
    uint16_t value = 0;

#ifdef INVERT_TLC59711
    value = 0xFFFF;
#endif
    tlc.setPWM(A_PWM_CH, value);//Amber
    tlc.setPWM(L_PWM_CH, value);//Lime
    tlc.setPWM(B_PWM_CH, value);//Blue
    tlc.setPWM(R_PWM_CH, value);//Red
    tlc.setPWM(C_PWM_CH, value);//Cyan

    tlc.setPWM(6 + A_PWM_CH, value);//Amber
    tlc.setPWM(6 + L_PWM_CH, value);//Lime
    tlc.setPWM(6 + B_PWM_CH, value);//Blue
    tlc.setPWM(6 + R_PWM_CH, value);//Red
    tlc.setPWM(6 + C_PWM_CH, value);//Cyan

#if (NUM_TLC59711 == 2)
    tlc.setPWM(12 + A_PWM_CH, value);//Amber
    tlc.setPWM(12 + L_PWM_CH, value);//Lime
    tlc.setPWM(12 + B_PWM_CH, value);//Blue
    tlc.setPWM(12 + R_PWM_CH, value);//Red
    tlc.setPWM(12 + C_PWM_CH, value);//Cyan

    tlc.setPWM(18 + A_PWM_CH, value);//Amber
    tlc.setPWM(18 + L_PWM_CH, value);//Lime
    tlc.setPWM(18 + B_PWM_CH, value);//Blue
    tlc.setPWM(18 + R_PWM_CH, value);//Red
    tlc.setPWM(18 + C_PWM_CH, value);//Cyan
#endif
    tlc.write();
}
