/*!
 *  @file tlc59711_drv.h
 *
 *  Local copy of Adafruit_TLC59711 1.3.4 (https://github.com/adafruit/Adafruit_TLC59711)
 *  kept in the sketch so the driver can be modified. Changes from upstream:
 *   - control bits of the write command are compile-time options (TLC59711_*)
 *   - TMGRST = 0: a latch no longer restarts the PWM cycle / blanks the outputs
 *   - hardware SPI (ESP32-S3 SPI3/HSPI, pins via GPIO matrix) instead of bit-banging,
 *     and the whole frame is sent in one transfer, so CPU stalls (flash cache, IPC,
 *     interrupts) can not pause SCKI and trigger a premature internal latch
 *   - write() skips the transfer when the frame is unchanged, resending it every
 *     TLC59711_REFRESH_MS to recover from any corrupted transfer
 *
 *  This is a library for the Adafruit 12-channel PWM/LED driver
 *
 *  Designed specifically to work with the Adafruit 12-channel PWM/LED driver
 *
 *  Pick one up today in the adafruit shop!
 *  ------> https://www.adafruit.com/product/1455
 *
 *  Two SPI Pins are required to send data: clock and data pin.
 *
 *  Adafruit invests time and resources providing this open source code,
 *  please support Adafruit andopen-source hardware by purchasing products
 *  from Adafruit!
 *
 *  Limor Fried/Ladyada (Adafruit Industries).
 *
 *  BSD license, all text above must be included in any redistribution
 */

#ifndef _TLC59711_DRV_H
#define _TLC59711_DRV_H

#include <Arduino.h>
#include <SPI.h>

// Function control bits sent with every write() (TLC59711 datasheet 8.3.3 / 8.4.3).
// OUTTMG  1: outputs change on the rising GS clock edge, 0: falling edge
#ifndef TLC59711_OUTTMG
#define TLC59711_OUTTMG 1
#endif
// EXTGCK  0: internal oscillator as GS clock, 1: SCKI as GS clock
#ifndef TLC59711_EXTGCK
#define TLC59711_EXTGCK 0
#endif
// TMGRST  1: every data latch resets the GS counter and forces all outputs OFF
//            for the rest of that PWM cycle (display timing reset, upstream default)
//         0: the new data takes effect without restarting the PWM cycle
#ifndef TLC59711_TMGRST
#define TLC59711_TMGRST 0
#endif
// DSPRPT  1: PWM cycle repeats automatically, 0: one cycle per latch only
#ifndef TLC59711_DSPRPT
#define TLC59711_DSPRPT 1
#endif
// BLANK   1: all outputs OFF
#ifndef TLC59711_BLANK
#define TLC59711_BLANK 0
#endif

// SPI bus used for the TLC59711 (FSPI/SPI2 is taken by the LCD)
#ifndef TLC59711_SPI_BUS
#define TLC59711_SPI_BUS HSPI
#endif
// SCKI frequency (TLC59711 max 10 MHz)
#ifndef TLC59711_SPI_FREQ
#define TLC59711_SPI_FREQ 2000000
#endif
// An unchanged frame is resent after this many ms (0: resend on every write())
#ifndef TLC59711_REFRESH_MS
#define TLC59711_REFRESH_MS 1000
#endif

#define TLC59711_FRAME_BYTES 28 // 4 command bytes + 12 channels x 16 bit

/*!
 *  @brief  Class that stores state and functions for interacting with
 *          TLC59711 Senor
 */
class Adafruit_TLC59711 {
public:
  Adafruit_TLC59711(uint8_t n, uint8_t c, uint8_t d);
  Adafruit_TLC59711(uint8_t n, SPIClass *theSPI = &SPI);

  bool begin();

  void setPWM(uint16_t chan, uint16_t pwm);
  void setLED(uint8_t lednum, uint16_t r, uint16_t g, uint16_t b);
  void getLED(uint8_t lednum, uint16_t &r, uint16_t &g, uint16_t &b);
  void write(bool force = false);
  void setBrightness(uint8_t bcr, uint8_t bcg, uint8_t bcb);
  void simpleSetBrightness(uint8_t BC);

private:
  uint16_t *pwmbuffer = NULL;
  uint8_t *frame = NULL;      // frame being built
  uint8_t *lastframe = NULL;  // frame sent last time
  bool sent = false;          // lastframe is valid
  uint32_t last_ms = 0;

  uint8_t BCr = 0, BCg = 0, BCb = 0;
  int8_t numdrivers = 0;
  int8_t _clk = -1, _dat = -1;
  SPIClass *_spi = NULL;
};

#endif
