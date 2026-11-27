#include <lvgl.h>
#include <Arduino_GFX_Library.h>
#include "common.h"

#define SCREEN_WIDTH    170
#define SCREEN_HEIGHT   320

/* More dev device declaration: https://github.com/moononournation/Arduino_GFX/wiki/Dev-Device-Declaration */
#if defined(DISPLAY_DEV_KIT)
Arduino_GFX *gfx = create_default_Arduino_GFX();
#else /* !defined(DISPLAY_DEV_KIT) */

/* More data bus class: https://github.com/moononournation/Arduino_GFX/wiki/Data-Bus-Class */
//Arduino_DataBus *bus = create_default_Arduino_DataBus();

/* More display class: https://github.com/moononournation/Arduino_GFX/wiki/Display-Class */
//Arduino_GFX *gfx = new Arduino_ILI9341(bus, DF_GFX_RST, 0 /* rotation */, false /* IPS */);

Arduino_DataBus *bus = new Arduino_ESP32SPI(11 /* DC */, 10 /* CS */, 12 /* SCK */, 13 /* MOSI */, GFX_NOT_DEFINED /* MISO */);//It is using VSPI (FSPI)
Arduino_GFX *gfx = new Arduino_ST7789(bus, 1 /* RST */, 0 /* rotation */, true /* IPS */, SCREEN_WIDTH /* width */, SCREEN_HEIGHT /* height */, 35 /* col offset 1 */, 0 /* row offset 1 */, 35 /* col offset 2 */, 0 /* row offset 2 */);
  
#endif /* !defined(DISPLAY_DEV_KIT) */
/*******************************************************************************
 * End of Arduino_GFX setting
 ******************************************************************************/

/* Change to your screen resolution */
static lv_disp_draw_buf_t draw_buf;
//static lv_color_t disp_draw_buf[SCREEN_WIDTH * SCREEN_HEIGHT];
static lv_color_t *disp_draw_buf;// must be allocated dynamically: a static buffer can exhaust the heap during updates
static lv_disp_drv_t disp_drv;

/* Display flushing */
void my_disp_flush(lv_disp_drv_t *disp, const lv_area_t *area, lv_color_t *color_p)
{
   uint32_t w = (area->x2 - area->x1 + 1);
   uint32_t h = (area->y2 - area->y1 + 1);

#if (LV_COLOR_16_SWAP != 0)
   gfx->draw16bitBeRGBBitmap(area->x1, area->y1, (uint16_t *)&color_p->full, w, h);
#else
   gfx->draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)&color_p->full, w, h);
#endif

   lv_disp_flush_ready(disp);
}

uint8_t board_angle = 0;
void flip_rotate(void)
{
    if (board_angle) board_angle = 0;
    else board_angle = 1;

    if (board_angle)
       gfx->setRotation(2);
    else
       gfx->setRotation(0);

    gfx->fillScreen(BLACK);
    lv_obj_invalidate(lv_scr_act());
    lv_refr_now(NULL);
}

/*
  // send commands manually
   gfx->begin(80000000);

  Arduino_DataBus *bus = gfx->getBus();
  bus->sendCommand(0x36);         // Memory Access Control
  bus->sendData(0x00);            // as in the panel vendor init code

  bus->sendCommand(0x3A);         // Interface Pixel Format
  bus->sendData(0x05);            // 16-bit/pixel

  bus->sendCommand(0x21);         // Display inversion ON (needed for correct colours)
*/

uint8_t lcd_init(void)
{
   // Init Display
   gfx->begin(80000000); /* specify data bus speed */
   gfx->setRotation(0);
   gfx->fillScreen(BLACK);
   lv_init();

#ifdef ESP32
   disp_draw_buf = (lv_color_t *)heap_caps_malloc(sizeof(lv_color_t) * SCREEN_WIDTH * SCREEN_HEIGHT, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
#else
   disp_draw_buf = (lv_color_t *)malloc(sizeof(lv_color_t) * SCREEN_WIDTH * SCREEN_HEIGHT);
#endif

   if (!disp_draw_buf)
   {
      dbg.println("LVGL disp_draw_buf allocate failed!");
   }
   else
   {
      lv_disp_draw_buf_init(&draw_buf, disp_draw_buf, NULL, SCREEN_WIDTH * SCREEN_HEIGHT);
      /* Initialize the display */
      lv_disp_drv_init(&disp_drv);
      /* Change the following line to your display resolution */
      disp_drv.hor_res = SCREEN_WIDTH;
      disp_drv.ver_res = SCREEN_HEIGHT;
      disp_drv.flush_cb = my_disp_flush;
      disp_drv.draw_buf = &draw_buf;
      lv_disp_drv_register(&disp_drv);

      /* Initialize the (dummy) input device driver */
      static lv_indev_drv_t indev_drv;
      lv_indev_drv_init(&indev_drv);
      indev_drv.type = LV_INDEV_TYPE_POINTER;
      lv_indev_drv_register(&indev_drv);

      return true;
   }

   return false;
}

