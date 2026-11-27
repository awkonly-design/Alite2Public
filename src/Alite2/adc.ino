#include "common.h"
extern "C" {
    #include "multi_language.h"
}

bool charger_connected = false;
uint8_t check_cnt = 0;

void init_adc(void)
{
    analogReadResolution(12);  // ESP32-S3: up to 12 bits (0..4095)
    analogSetAttenuation(ADC_11db); // input range up to 3.3 V
}

bool get_charger_connected(void)
{
    return charger_connected;
}

float readPDVolt(void)
{
    int raw = analogRead(USB_PD_ADC_PIN);
    float adc_voltage = raw * (3.3 / 4095.0);     // voltage at the ADC pin

    return adc_voltage * ((15.0 + 4.99) / 4.99);  // actual input voltage (divider)
}

void ui_check_usb_pd(void)
{
    float pd = readPDVolt();
    char str[128];

    //charger_connected = false;
    //return;

    if (pd > USB_CONNECTED_VOLT)
    {
        if ((pd < 10.0) || (pd > 13.0))
        {
            check_cnt++;

            if (check_cnt >= 3)
            {
                check_cnt = 3;
                digitalWrite(BAT_EN, HIGH);//turn off battery
                digitalWrite(DCDC_EN_PIN, LOW);//turn off pullup led board

                snprintf(str, sizeof(str), get_multi_language_format("Can't turn on\nLED with %4.1fV\nOnly charging", wifiParam.lang), pd);
                show_message_box("Wrong volate", (const char *)str);
                charger_connected = true;
            }
        }
        else
        {
            check_cnt = 0;
            charger_connected = true;
        }
    }
    else
    {
        check_cnt = 0;
        charger_connected = false;
    }
}
