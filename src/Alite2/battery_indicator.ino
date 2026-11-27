#include <common.h>
#include <Wire.h>

#define BQ28Z610_ADDR 0x55  // I2C 7-bit address
#define REG_SOC       0x2C  // Relative State of Charge
#define REG_STATUS    0x0A  // Battery Status
#define REG_CURRENT   0x0C  // mA
#define REG_VOLT      0x08  // mV
#define REG_TEMP      0x06  // mV

#define BATTERY_FULL_COLOR      0xFFFFFF
#define BATTERY_GREEN_COLOR     0x00FF00
#define BATTERY_CHARGE_COLOR    0x00FFFF
#define BATTERY_LACK_COLOR      0xFF0000
uint32_t battery_lastEpoch = 0;
uint8_t no_battery_cnt = 0;
float battery_temp = 0.0;
uint8_t battery_danger = NORMAL_BATTERY;

bool get_chk_battery(void)
{
    return (no_battery_cnt == 0);//true = no battery
}

float get_battery_temp(void)
{
    if (get_chk_battery()) battery_temp = 0.0;
    return battery_temp;
}

void set_battery_danger(void)
{
    switch(battery_danger)
    {
        case NORMAL_BATTERY:
            if (get_battery_temp() >= 56.0)
            {
                battery_danger = HEATED_BATTERY;
                custom_label_set_text(ui_FirstLabel, "Blocked");
            }
            else
                lv_obj_set_style_text_color(ui_TempLabel, lv_color_hex(0xFFFFFF), LV_PART_MAIN);
        break;
        case HEATED_BATTERY:
            if (get_battery_temp() >= 58.0)
            {
                battery_danger = DANGER_BATTERY;
                custom_label_set_text(ui_FirstLabel, "Battery protection");
            }
            else if (get_battery_temp() <= 53.0)
            {
                battery_danger = NORMAL_BATTERY;
                custom_label_set_text(ui_FirstLabel, "Press and hold F2");
            }
            else
            {
                custom_checkbox(ui_BoostCheckbox, false);
                set_led_boost(false);//to make it sure
                lv_obj_set_style_text_color(ui_TempLabel, lv_color_hex(0xFFFF00), LV_PART_MAIN);
            }
        break;
        case DANGER_BATTERY:
            if (get_battery_temp() <= 53.0)
            {
                battery_danger = NORMAL_BATTERY;
                set_blackout(false);
                custom_label_set_text(ui_FirstLabel, "Press and hold F2");
            }
            else
            {
                custom_checkbox(ui_BoostCheckbox, false);
                set_led_boost(false);//to make it sure
                set_blackout(true);//to make it sure
                lv_obj_set_style_text_color(ui_TempLabel, lv_color_hex(0xFF0000), LV_PART_MAIN);
            }
        break;
    }
}

uint8_t get_battery_danger(void)
{
    return battery_danger;
}

void init_battery(void)
{
    Wire.begin(BATTERY_SDA, BATTERY_SCL);  // SDA = IO38, SCL = IO39
}

static uint16_t readWord(uint8_t reg) 
{
    Wire.beginTransmission(BQ28Z610_ADDR);
    Wire.write(reg);
    Wire.endTransmission(false);

    Wire.requestFrom(BQ28Z610_ADDR, (uint8_t)2);
    if (Wire.available() == 2) 
    {
        uint8_t lsb = Wire.read();
        uint8_t msb = Wire.read();
        return (msb << 8) | lsb;
    } 
    else 
    {
        //dbg.println("I2C read error");
        return 0xFFFF;
    }
}

float convertToCelsius(uint16_t rawTemperature) 
{
    return (rawTemperature * 0.1) - 273.15;
}

void loop_battery_with_top_indicator(void)
{
    if ((millis() - battery_lastEpoch) >= 1000)//msec
    {
        battery_lastEpoch = millis();
        ui_check_usb_pd();

        uint16_t soc = readWord(REG_SOC);       // 0~100 (%)
        uint16_t status = readWord(REG_STATUS); // Bit field
        int16_t current = readWord(REG_CURRENT);
        uint16_t volt = readWord(REG_VOLT);
        uint16_t temp = readWord(REG_TEMP);
        float celsius = convertToCelsius(temp);

        //dbg.printf("Status %x\n", status);
        if ((soc <= 100) && ((status & 0x0F) == 0x00) && (-50.0 < celsius) && (celsius < 100.0)) //Battery Ok
        {
            no_battery_cnt = 5;
            dbg.printf("Battery: %d%% %dmV %dmA\n", soc, volt, current);

            char temp_str[16];
            battery_temp = celsius;
            sprintf(temp_str, "%3.0f°C", battery_temp);
            custom_label_set_text(ui_TempLabel, temp_str);
            
            if (status & (1 << 5))
            {
                dbg.println("Fully charged");
                lv_obj_add_flag(ui_BoltImage, LV_OBJ_FLAG_HIDDEN);
                lv_obj_set_style_bg_color(ui_BarBattery, lv_color_hex(BATTERY_FULL_COLOR), LV_PART_INDICATOR | LV_STATE_DEFAULT );
            }
            else if (status & (1 << 6))
            {
                dbg.println("Charging: No");
                lv_obj_add_flag(ui_BoltImage, LV_OBJ_FLAG_HIDDEN);
                lv_obj_set_style_bg_color(ui_BarBattery, lv_color_hex(BATTERY_GREEN_COLOR), LV_PART_INDICATOR | LV_STATE_DEFAULT );
                if (soc < 20)
                    lv_obj_set_style_bg_color(ui_BarBattery, lv_color_hex(BATTERY_LACK_COLOR), LV_PART_INDICATOR | LV_STATE_DEFAULT );
            }
            else 
            {
                dbg.println("Charging: Yes");
                lv_obj_clear_flag(ui_BoltImage, LV_OBJ_FLAG_HIDDEN);
                lv_obj_set_style_bg_color(ui_BarBattery, lv_color_hex(BATTERY_CHARGE_COLOR), LV_PART_INDICATOR | LV_STATE_DEFAULT );
            }
            lv_bar_set_value(ui_BarBattery, soc, LV_ANIM_OFF);
        }
        else
        {
            if (no_battery_cnt > 0) no_battery_cnt--;

            if (get_chk_battery())//No battery
            {
                lv_obj_add_flag(ui_BoltImage, LV_OBJ_FLAG_HIDDEN);
                lv_obj_set_style_bg_color(ui_BarBattery, lv_color_hex(BATTERY_LACK_COLOR), LV_PART_INDICATOR | LV_STATE_DEFAULT );
                lv_bar_set_value(ui_BarBattery, 0, LV_ANIM_OFF);
                custom_label_set_text(ui_TempLabel, "");
            }
        }

        set_battery_danger();
        top_icons_indicator();
    }
}

uint8_t indicate_step = 0;

void top_icons_indicator(void)
{
    indicate_step++;
    switch(indicate_step)
    {
        case 1:
            if (param.boost)
                lv_obj_clear_flag(ui_BoostImage, LV_OBJ_FLAG_HIDDEN);
            else
                lv_obj_add_flag(ui_BoostImage, LV_OBJ_FLAG_HIDDEN);
        break;
        case 2:
            if (wifiParam.wireless == WIRELESS_BLE)
            {
                if (alite2_ble_connected())
                    lv_obj_clear_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
                else
                    lv_obj_add_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
            }
            else if ((wifiParam.wireless == WIRELESS_ARTNET) || (wifiParam.wireless == WIRELESS_sACN))
            {
                if (alite2_wifi_connected())
                {
                    lv_img_dsc_t *img;
                    long rssi = alite2_wifi_rssi();

                    if (rssi < - 50)
                        img = (lv_img_dsc_t *)&ui_img_wifi2_png;
                    else
                        img = (lv_img_dsc_t *)&ui_img_wifi3_png;

                    if (lv_img_get_src(ui_RadioImage) != img)
                        lv_img_set_src(ui_RadioImage, img);
                    lv_obj_clear_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
                }
                else
                    lv_obj_add_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
            }
            else if (wifiParam.wireless == WIRELESS_LUMEN)
            {
                if (lumen_is_connected())
                    lv_obj_clear_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
                else
                    lv_obj_add_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
            }
            else
                lv_obj_add_flag(ui_RadioImage, LV_OBJ_FLAG_HIDDEN);
        break;
        default:
            indicate_step = 0;
    }
}
