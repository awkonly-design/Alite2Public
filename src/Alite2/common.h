#include <Preferences.h>
#include <Adafruit_NeoPixel.h>
#include <driver/rtc_io.h>
#include <lvgl.h>
#include <USB.h>

#ifndef __COMMON_H_
#define __COMMON_H_

#include "config.h"
#include <Alite2Link.h>   // BLE / WiFi / OTA link layer (precompiled): wireless modes, BLE identity

#define FIRMWARE_VERSION      "1.2.7"

//#define USE_USB_DEBUG
//#define USE_WEB_FILESYSTEM      // WARNING: web file manager on port 80 without any password (anyone on the network can read / replace files)
#define USE_LUMENRADIO

#ifdef USE_USB_DEBUG
    #define dbg               USBSerial//Serial: Change debug port from UART0 to USBCDC
#else
    #define dbg               Serial
#endif

#define PARAM_VERSION         0x00A0

//Preferenc key length have to be lesser than 15
#define MASTER_INTENSITY_KEY  "masterIntensity"
#define CROSS_FADE_KEY        "crossFade"
#define CCT_INTENSITY_KEY     "cctIntensity"
#define CCT_POS_KEY           "cctPos"
#define GREEN_MAGENTA_KEY     "greenMagenta"
#define WIRELESS_KEY          ALITE2_NVS_WIRELESS_KEY   // owned by Alite2Link, do not change
#define DMX_CH_KEY            "dmxChKey"
#define UNIVERSE_KEY          "universeKey"
#define DMX_MODE_KEY          "dmxModeKey"
#define DMX_BITS_KEY          "dmxBitsKey"
#define WAVEDIMM_KEY          "waveDimmAddr"
#define WAVELENGTH_KEY        "wavelengthAddr"
#define COLOR_TYPE_KEY        "colorTypeAddr"
#define HUE_KEY               "hueAddr"
#define SAT_KEY               "satAddr"
#define EFFECT_NAME_KEY       "effectNameAddr"
#define EFFECT_DIM_KEY        "effectDimAddr"
#define EFFECT_SPEED_KEY      "effectSpeedAddr"
#define EFFECT_NO_KEY         "effectNoAddr"
#define EFFECT_TRIG_KEY       "effectTrigAddr"
#define EFFECT_NAME_LEN       32
#define BOOST_KEY             "boostAddr"

#define LAST_PAGE_KEY         "lastPage"
#define LANG_KEY              "lang"


#define SLOT_NAME_KEY         "slotNameAddr"

#define IKEY_DELAY           2
#define LONG_IKEY_DELAY      20

#define MIN_KELVIN           1700
#define MAX_KELVIN           20000
#define MIN_WAVELENGTH       430//380
#define MAX_WAVELENGTH       675

//PIN Assign
#define TFT_BL                14
#define WAKEUP_GPIO           GPIO_NUM_16//GPIO_NUM_2
#define BAT_EN                42
#define KEY1_PIN              WAKEUP_GPIO
#define KEY2_PIN              15
#define KEY3_PIN              37//do not use
//#define BATTERY_CHARGE_PIN    19//40
#define DCDC_EN_PIN           48
#define ROTARY_ENCODER_A_PIN  41//7
#define ROTARY_ENCODER_B_PIN  40//6
#define SECOND_ENCODER_A_PIN  7//40
#define SECOND_ENCODER_B_PIN  6//41
#define BATTERY_SCL           39//36
#define BATTERY_SDA           38//35
#define USB_PD_ADC_PIN        8
#define LUMEN_STATUS_PIN      46
#define LUMEN_RX_PIN          18
#define LUMEN_TX_PIN          17
#define LUMEN_LINK_PIN        9

#define LCD_PWM_HZ            5000//Hz
#define LCD_PWM_BITS          12
#define LCD_PWM_VALUE         (1 << LCD_PWM_BITS)


#define PWM_HZ                5000//Hz
// How many boards do you have chained?
#define TLC59711_CHANNELS     12
#define NUM_TLC59711          2
#define NUM_PIXELS            (2 * NUM_TLC59711)
#define INVERT_TLC59711
#define TLC59711_DAT          5
#define TLC59711_CLK          4

//#define PWM_HZ                5000//Hz
#define PWM_BITS              16
#define MAX_PWM_VALUE         0xFFFF
//#define NEO_PIXEL_DEPTH     0xFF


#define USB_CONNECTED_VOLT    2.0

#if 0
    #define A_PWM_CH              1//0
    #define L_PWM_CH              0//1
    #define B_PWM_CH              3//2
    #define R_PWM_CH              4//3
    #define C_PWM_CH              2//4
#else
    #define A_PWM_CH              0
    #define L_PWM_CH              1
    #define B_PWM_CH              2
    #define R_PWM_CH              3
    #define C_PWM_CH              4
#endif

// LED calibration (output limits, cut-offs, colour tables) comes from the
// precompiled Alite2Calib library (src/libraries/Alite2Calib).
#include <Alite2Calib.h>
#define LED_LOW_CUTOFF        (alite2_calib_limits.low_cutoff)
#define LED_BLUE_LOW_CUTOFF   (alite2_calib_limits.blue_low_cutoff)
#define GM_MAXIMUM_LIMIT      (alite2_calib_limits.gm_max_limit)
#define NORMAL_LED_LIMIT      (alite2_calib_limits.normal_limit)
#define BOOST_LED_LIMIT       (alite2_calib_limits.boost_limit)

#define AVG_COUNT       64//512//1024//64
#define AVG_SHIFT       6//9//10//6

#define ARTNET_TITLE    "Artnet"
#define BLUETOOTH_TITLE "Bluetooth"
#define DMX512_TITLE    "Lumen radio"

// per-channel limits of the colour modes (Alite2Calib)
#define Cyan_LED_LIMIT        (alite2_calib_limits.cyan_limit)
#define Lime_LED_LIMIT        (alite2_calib_limits.lime_limit)
#define Amber_LED_LIMIT       (alite2_calib_limits.amber_limit)
#define Indigo_LED_LIMIT      (alite2_calib_limits.indigo_limit)
#define Deepred_LED_LIMIT     (alite2_calib_limits.deepred_limit)

enum
{
    PIX0_ADDR = 0,
    PIX1_ADDR = 3,
    PIX2_ADDR = 2,
    PIX3_ADDR = 1,
};

enum
{
		NULL_KEY = 0,

		TURN_DOWN_KEY,
		TURN_UP_KEY,
		TURN_DOWN_FAST_KEY,
		TURN_UP_FAST_KEY,

		SECOND_DOWN_KEY,
		SECOND_UP_KEY,
		SECOND_DOWN_FAST_KEY,
		SECOND_UP_FAST_KEY,
		INT_KEY_MAX,//interrupt key end

		F1_KEY = INT_KEY_MAX,
		F2_KEY,
		F3_KEY,
		IKEY_MAX,

		F1_KEY_DOWN,
		F2_KEY_DOWN,
		F3_KEY_DOWN,
		IKEY_DOWN_MAX,

		F1_KEY_LONG,
		F2_KEY_LONG,
		F3_KEY_LONG,
		IKEY_LONG_MAX,

		F1_KEY_UP,
		F2_KEY_UP,
		F3_KEY_UP,
};

enum
{
    CCT_SCREEN,
    COLOR_SCREEN,
    MAIN_SCREEN,
    EFFECT_SCREEN,
    ARTNET_SCREEN,
    SETUP_SCREEN,
    FLIP_SCREEN,
    QR_SCREEN,
    MENU_SCREEN,
    SCREEN_NUMBER
};

enum
{
    LIME_INDEX = 0,
    CYAN_INDEX,
    RED_INDEX,
    AMBER_INDEX,
    BLUE_INDEX,
    COLOR_DEPTH
};

// Wireless modes (WIRELESS_OFF, WIRELESS_BLE, WIRELESS_ARTNET, ...) are defined in Alite2Link.h

enum
{
    // never change this order
    DMX_CCT_GM = 0,//
    DMX_CCT_HSI,//
    DMX_CCT_RGB,//
    DMX_RGBW,//
    DMX_CLAID,//
    DMX_FULL,//

    DMX_CCT_GM_PIXELS,//
    DMX_CCT_HSI_PIXELS,//
    DMX_CCT_RGB_PIXELS,//
    DMX_RGBW_PIXELS,//
    DMX_CLAID_PIXELS,//
    DMX_FULL_PIXELS,//

    DMX_CCT_EFFECT,
    DMX_CCT_XY,
    DMX_CCT_XY_PIXELS,
    DMX_XY,
    DMX_XY_PIXELS,          // 16: last built-in chart

    DMX_MODE_SINGLE,        // 17: BLE legacy single-zone frame (stored in settings, do not move)
    DMX_MODE_PIXELS,        // 18: BLE legacy per-pixel frame (stored in settings, do not move)

    // ---- add your own DMX charts here (19, 20, ...), then:
    //   1. add a `case` for it in set_artnet_pwm_update() (led_pwm.ino)
    //   2. add its name at the END of the DmxModeDropdown options (ArtnetScreen, e.g. in ui_studio)
    //   3. the official app can send DMX data in it (chart = its number)
    DMX_CHART_END,
};

enum
{
    DMX_8BITS = 0,
    DMX_16BITS,
};

enum
{
    DISPLAY_LED_LOCAL,
    DISPLAY_LED_BLE,
    DISPLAY_LED_ARTNET,
    DISPLAY_LED_DMX512,
};


#define BLE_SINGLE_LEN    11
#define BLE_PIXELS_LEN    20
#define MAX_ARTNET_BUFF   25// size of the largest mode

//Single
enum
{
    V_MASTER_CH = 0,
    V_CROSS_CH,
    V_CCT_DIM_CH,
    V_CCT_CH,
    V_GM_CH,

    V_COLOR_DIM_CH,
    V_COLOR_CH,
};

enum
{
    V_COLOR_H_CH = V_COLOR_DIM_CH,
    V_COLOR_S_CH,
    V_COLOR_I_CH,
};

enum
{
    V_COLOR_Y_CH = V_COLOR_DIM_CH,
    V_COLOR_x_CH,
    V_COLOR_y_CH,
};

enum
{
    V_COLOR_Cyan_CH = V_COLOR_DIM_CH,
    V_COLOR_Lime_CH,
    V_COLOR_Amber_CH,
    V_COLOR_Indigo_CH,
    V_COLOR_Deepred_CH,
};

enum
{
    NORMAL_BATTERY,
    HEATED_BATTERY,
    DANGER_BATTERY,
};

enum    // options of UpdateDropdown (Setup > H/W)
{
    UPGRADE_FIRMWARE = 0,   // Upgrade F/W: install the official firmware from the manufacturer's update server
    UNDO_FIRMWARE,          // Revert F/W: boot the other OTA slot
    FACTORY_RESET,
    LUMEN_RESET,
    ENGLISH_MODE,
    KOREAN_MODE,
    JAPANESE_MODE,
};

enum
{
    COLOR_HSI,
    COLOR_WAVE,
    COLOR_CLAID,
    COLOR_XY,
};

enum
{
    EFFECT_FIRE = 0,
    EFFECT_CANDLE,
    EFFECT_FIREWORK,
    EFFECT_FLICKER,
    EFFECT_ACCIDENT,
    EFFECT_EMERGENCY,
    EFFECT_WELDING,
    EFFECT_TV,
    EFFECT_PULSE,
};

enum
{
    TRIG_OFF = 0,
    TRIG_ON,
    TRIG_BLACKOUT,
};

#pragma pack(push,1)
struct pwm_type
{
    uint16_t pwm[COLOR_DEPTH];
};

struct artnet_white_type
{
    float dimming;
    float kelvin;
};

struct artnet_rgb_type
{
    uint8_t r;
    uint8_t g;
    uint8_t b;
};

struct hs_type
{
    float hue;
    float sat;
};

struct color_type
{
    uint8_t type;
    float dimming;
    float length;
    hs_type hs;
};

struct effect_type 
{
    //char name[EFFECT_NAME_LEN];
    float dimming;
    float speed;
    uint8_t no;
    uint8_t trig;
};

struct parametersType
{
    uint16_t version;
    float master_intensity;
    float cross_fade;
    float cct_intensity;
    float cct_pos;
    float green_magenta;
    uint16_t dmx_ch;
    uint16_t universe;
    uint8_t dmx_mode;
    uint8_t dmx_bits;
    color_type color;
    effect_type effect;
    bool boost;
};

// wireless / UI settings kept in NVS namespace "WIFI" (WiFi credentials, timezone and BLE MAC are owned by Alite2Link)
struct wifi_type
{
    uint8_t wireless;   // WIRELESS_*
    uint8_t lastPage;
    uint8_t lang;
};
#pragma pack(pop)

extern USBCDC USBSerial;
extern Preferences prefs;
extern parametersType param;
extern Preferences wififs;
extern wifi_type wifiParam;
extern pwm_type localLED;
extern Adafruit_NeoPixel pixels;
extern uint8_t display_led;
extern bool art_update;
extern uint32_t delay_for_any;
extern bool ui_is_updating;
extern bool fs_mounted;
extern uint8_t need_to_calc;

#endif

